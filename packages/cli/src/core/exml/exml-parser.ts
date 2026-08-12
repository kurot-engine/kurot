/**
 * EXML Parser — converts an XML element tree into a SkinIR.
 *
 * Walks the XML tree produced by the lightweight XML parser and
 * produces an intermediate representation ready for code generation.
 */

import type { XElement, XNode } from './xml-parser.js';
import { parseXML, filterElements, getTextContent } from './xml-parser.js';
import { lookupComponent, localName, isPropertyNode, parsePropertyNode } from './registry.js';
import type { NamespaceModule } from './registry.js';
import type {
	SkinIR,
	SkinNode,
	PropertyAssignment,
	PropertyValue,
	PropertyChild,
	StateDef,
	StateOverride,
	StateAddItems,
	StateSetProperty,
} from './ast.js';

// ── Public API ───────────────────────────────────────────────────────

/**
 * Parse an EXML source string into a SkinIR.
 *
 * @param source - EXML source text
 * @param className - Optional class name (used for factory function name)
 * @param customNamespaces - Project-defined EXML namespaces
 * @returns The parsed skin intermediate representation
 */
export function parseEXML(
	source: string,
	className?: string,
	customNamespaces: readonly NamespaceModule[] = [],
): SkinIR {
	const root = parseXML(source);
	const ir = parseSkinRoot(root, customNamespaces);
	if (className) {
		(ir as { className: string }).className = className;
	}
	return ir;
}

/**
 * Parse an already-parsed XML root element into a SkinIR.
 *
 * @param root - The parsed XML root element
 * @param customNamespaces - Project-defined EXML namespaces
 * @returns The parsed skin intermediate representation
 */
export function parseSkinRoot(root: XElement, customNamespaces: readonly NamespaceModule[] = []): SkinIR {
	const ctx = new ParseContext(customNamespaces);
	ctx.processRoot(root);
	return ctx.toIR();
}

// ── Parse context ────────────────────────────────────────────────────

class ParseContext {
	/**
	 * Collected imports: className → module.
	 */
	imports = new Map<string, string>();
	/**
	 * Skin part IDs.
	 */
	skinParts: string[] = [];
	/**
	 * All nodes (flat list for state processing).
	 */
	allNodes: SkinNode[] = [];
	/**
	 * State definitions.
	 */
	states: StateDef[] = [];
	/**
	 * Declarations.
	 */
	declarations: SkinNode[] = [];
	/**
	 * Tag names that could not be resolved to a component or namespace.
	 */
	unresolvedTags: string[] = [];
	/**
	 * Counter for generating unique variable names.
	 */
	private varCounter = 0;

	constructor(private readonly customNamespaces: readonly NamespaceModule[]) {}

	/**
	 * Process the root `<eui:Skin>` element.
	 */
	processRoot(root: XElement): void {
		// Root should be a Skin tag
		const rootClass = localName(root.name);
		if (rootClass !== 'Skin') {
			throw new Error(`EXML: expected root element to be Skin, got "${rootClass}"`);
		}

		// Ensure Skin is imported
		this.addImport('Skin', '@kurot/ui');

		// Extract root-level properties (class, width, height, etc.)
		for (const attr of root.attributes) {
			if (attr.name === 'class') {
				this._className = attr.value;
			} else if (attr.name === 'width') {
				this._width = this.parseValue(attr.value);
			} else if (attr.name === 'height') {
				this._height = this.parseValue(attr.value);
			} else if (attr.name === 'states') {
				// Shorthand: states="up,down,disabled" → expand to StateDef list
				const stateNames = attr.value
					.split(',')
					.map(s => s.trim())
					.filter(Boolean);
				for (const name of stateNames) {
					if (!this.states.find(s => s.name === name)) {
						this.states.push({ name, stateGroups: [], overrides: [] });
					}
				}
			} else if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:')) {
				// Skip namespace declarations
			} else {
				const dotIndex = attr.name.indexOf('.');
				this.rootProperties.push({
					name: dotIndex >= 0 ? attr.name.substring(0, dotIndex) : attr.name,
					state: dotIndex >= 0 ? attr.name.substring(dotIndex + 1) : '',
					value: this.parseValue(attr.value),
				});
			}
		}

		// First pass: collect state definitions from property children
		// (e.g. <eui:states><eui:State name="up"/></eui:states>)
		const childElements = filterElements(root.children);
		this.collectStates(childElements);

		// Second pass: process non-state children
		for (const el of childElements) {
			const cls = localName(el.name);
			const isPropNode = isPropertyNode(el.name);
			const isLowerProp = cls.length > 0 && cls[0] === cls[0].toLowerCase();

			// Skip property nodes (dot notation or lowercase-first like <eui:states>)
			if (isPropNode || isLowerProp) continue;

			if (cls === 'Declarations') {
				this.processDeclarations(el);
				continue;
			}

			// Regular child node
			const node = this.parseNode(el);
			if (node) {
				this.allNodes.push(node);
			}
		}

		// Collect state-specific property overrides from nodes
		this.collectStateOverrides();
	}

	/**
	 * Class name extracted from the root `class` attribute.
	 */
	private _className = '';
	/**
	 * Root width/height.
	 */
	private _width?: PropertyValue;
	private _height?: PropertyValue;
	private rootProperties: PropertyAssignment[] = [];

	/**
	 * Collect state definitions from children.
	 *
	 * Handles both direct `<eui:State>` children and `<eui:states>` property
	 * children.
	 */
	private collectStates(childElements: XElement[]): void {
		for (const el of childElements) {
			const cls = localName(el.name);

			// Direct State child
			if (cls === 'State') {
				this.states.push(this.parseState(el));
				continue;
			}

			// Property child with lowercase first char (e.g. <eui:states>)
			const isLowerProp = cls.length > 0 && cls[0] === cls[0].toLowerCase();
			if (isLowerProp || isPropertyNode(el.name)) {
				// Look inside for State elements
				for (const child of filterElements(el.children)) {
					const childCls = localName(child.name);
					if (childCls === 'State') {
						this.states.push(this.parseState(child));
					}
				}
			}
		}
	}

	/**
	 * Process a `<Declarations>` element.
	 */
	private processDeclarations(el: XElement): void {
		const children = filterElements(el.children);
		for (const child of children) {
			const node = this.parseNode(child);
			if (node) this.declarations.push(node);
		}
	}

	/**
	 * Parse a `State` element and its overrides.
	 */
	private parseState(el: XElement): StateDef {
		const nameAttr = this.getAttr(el, 'name') ?? '';
		const stateGroups = (this.getAttr(el, 'stateGroups') ?? '')
			.split(',')
			.map(s => s.trim())
			.filter(Boolean);
		const overrides: StateOverride[] = [];

		for (const child of filterElements(el.children)) {
			const cls = localName(child.name);
			if (cls === 'AddItems') {
				overrides.push(this.parseAddItems(child));
			} else if (cls === 'SetProperty') {
				overrides.push(this.parseSetProperty(child));
			}
		}

		return { name: nameAttr, stateGroups, overrides };
	}

	/**
	 * Parse an `AddItems` override.
	 */
	private parseAddItems(el: XElement): StateAddItems {
		return {
			type: 'AddItems',
			targetId: this.getAttr(el, 'target') ?? '',
			destinationId: this.getAttr(el, 'destination') ?? '',
			position: parseInt(this.getAttr(el, 'position') ?? '-1', 10),
			propertyName: this.getAttr(el, 'propertyName') ?? '',
		};
	}

	/**
	 * Parse a `SetProperty` override.
	 */
	private parseSetProperty(el: XElement): StateSetProperty {
		const rawValue = this.getAttr(el, 'value') ?? '';
		return {
			type: 'SetProperty',
			targetId: this.getAttr(el, 'target') ?? '',
			name: this.getAttr(el, 'name') ?? '',
			value: this.parseValue(rawValue),
		};
	}

	/**
	 * Collected IDs for duplicate detection.
	 */
	private _idSet = new Set<string>();

	/**
	 * Parse a component XML element into a `SkinNode`.
	 */
	private parseNode(el: XElement): SkinNode | null {
		const cls = localName(el.name);
		const info = lookupComponent(el.name, this.customNamespaces);

		if (!info) {
			// Unknown component — dropped from the generated skin; the caller
			// (see `unresolvedTags`) is responsible for surfacing this as a warning.
			this.unresolvedTags.push(el.name);
			return null;
		}

		// Register import
		this.addImport(cls, info.module);

		// Generate variable name
		const id = this.getAttr(el, 'id');
		if (id) {
			if (this._idSet.has(id)) {
				throw new Error(`EXML: duplicate id "${id}" in skin`);
			}
			this._idSet.add(id);
		}
		const varName = id || this.genVar(cls);

		// Track skin parts
		if (id) {
			this.skinParts.push(id);
		}

		// Parse properties from attributes
		const properties: PropertyAssignment[] = [];
		const includeIn =
			this.getAttr(el, 'includeIn')
				?.split(',')
				.map(s => s.trim()) ?? [];
		const excludeFrom =
			this.getAttr(el, 'excludeFrom')
				?.split(',')
				.map(s => s.trim()) ?? [];

		for (const attr of el.attributes) {
			const attrName = attr.name;
			const attrValue = attr.value;

			// Skip special attributes
			if (attrName === 'id' || attrName === 'includeIn' || attrName === 'excludeFrom') continue;

			// Check for state-specific property (e.g. "label.up")
			const dotIdx = attrName.lastIndexOf('.');
			if (dotIdx > 0) {
				const prop = attrName.substring(0, dotIdx);
				const state = attrName.substring(dotIdx + 1);
				properties.push({
					name: prop,
					state,
					value: this.parseValue(attrValue),
				});
			} else {
				properties.push({
					name: attrName,
					state: '',
					value: this.parseValue(attrValue),
				});
			}
		}

		// Process child elements
		const children: SkinNode[] = [];
		const propertyChildren: PropertyChild[] = [];

		for (const child of filterElements(el.children)) {
			// Property node? Egret accepts both owner-qualified nodes such as
			// <eui:Button.label> and lowercase shorthand such as <eui:layout>.
			const childClass = localName(child.name);
			const isLowerProperty = childClass.length > 0 && childClass[0] === childClass[0].toLowerCase();
			if (isPropertyNode(child.name) || isLowerProperty) {
				const parsed = parsePropertyNode(child.name);
				const propertyName = parsed?.property ?? (isLowerProperty ? childClass : '');
				if (propertyName) {
					const childNodes: (SkinNode | string)[] = [];
					// Check for text content
					const text = getTextContent(child.children).trim();
					if (text) {
						childNodes.push(text);
					}
					// Check for element children
					for (const sub of filterElements(child.children)) {
						const node = this.parseNode(sub);
						if (node) childNodes.push(node);
					}
					propertyChildren.push({
						propertyName,
						nodes: childNodes,
					});
				}
				continue;
			}

			// Regular child → goes to default property
			const childNode = this.parseNode(child);
			if (childNode) {
				children.push(childNode);
			}
		}

		// Check for text content (useful for Label, etc.)
		const textContent = getTextContent(el.children).trim();

		return {
			className: cls,
			module: info.module,
			varName,
			id,
			properties,
			children,
			propertyChildren,
			includeIn,
			excludeFrom,
		};
	}

	/**
	 * Parse a raw attribute value string into a `PropertyValue`.
	 */
	private parseValue(raw: string): PropertyValue {
		// Check for binding expression {expr}
		const bindingMatch = raw.match(/^\{(.+)\}$/);
		if (bindingMatch) {
			return { type: 'binding', expression: bindingMatch[1].trim() };
		}

		// Check for percent value
		if (raw.endsWith('%')) {
			const num = parseFloat(raw);
			if (!isNaN(num)) {
				return { type: 'percent', value: num };
			}
		}

		// Check for boolean
		if (raw === 'true') return { type: 'literal', value: true };
		if (raw === 'false') return { type: 'literal', value: false };

		// Check for null
		if (raw === 'null') return { type: 'literal', value: null };

		// Check for number
		const num = Number(raw);
		if (raw !== '' && !isNaN(num)) {
			return { type: 'literal', value: num };
		}

		// Default to string
		return { type: 'literal', value: raw };
	}

	/**
	 * After all nodes are parsed, collect state-specific overrides.
	 */
	private collectStateOverrides(): void {
		// Process includeIn/excludeFrom on nodes → generate AddItems overrides
		for (const node of this.allNodes) {
			const includedStates =
				node.includeIn.length > 0
					? node.includeIn
					: node.excludeFrom.length > 0
						? this.states.map(state => state.name).filter(name => !node.excludeFrom.includes(name))
						: [];
			if (includedStates.length > 0) {
				// Node should only exist in specified states
				// Generate AddItems for each state, and the node is NOT added to
				// elementsContent by default — it's only added via state overrides
				for (const stateName of includedStates) {
					this.addStateOverride(stateName, {
						type: 'AddItems',
						targetId: node.id ?? node.varName,
						destinationId: '',
						position: -1,
						propertyName: 'elementsContent',
					});
				}
			}
		}
	}

	/**
	 * Add an override to an existing state definition.
	 */
	private addStateOverride(stateName: string, override: StateOverride): void {
		const state = this.states.find(s => s.name === stateName);
		if (state) {
			(state as { overrides: StateOverride[] }).overrides.push(override);
		}
	}

	/**
	 * Generate a unique variable name.
	 */
	private genVar(base: string): string {
		return `_${base.charAt(0).toLowerCase() + base.slice(1)}${++this.varCounter}`;
	}

	/**
	 * Get an attribute value by name.
	 */
	private getAttr(el: XElement, name: string): string | undefined {
		return el.attributes.find(a => a.name === name)?.value;
	}

	/**
	 * Register an import.
	 */
	private addImport(className: string, module: string): void {
		this.imports.set(className, module);
	}

	/**
	 * Build the final `SkinIR`.
	 */
	toIR(): SkinIR {
		// Extract numeric width/height (percent not valid for skin itself)
		let width: number | undefined;
		let height: number | undefined;
		if (this._width?.type === 'literal' && typeof this._width.value === 'number') {
			width = this._width.value;
		}
		if (this._height?.type === 'literal' && typeof this._height.value === 'number') {
			height = this._height.value;
		}

		return {
			className: this._className,
			superClassName: 'Skin',
			width,
			height,
			properties: this.rootProperties,
			imports: this.imports,
			skinParts: this.skinParts,
			children: this.allNodes,
			propertyChildren: [],
			states: this.states,
			declarations: this.declarations,
			unresolvedTags: this.unresolvedTags,
		};
	}
}
