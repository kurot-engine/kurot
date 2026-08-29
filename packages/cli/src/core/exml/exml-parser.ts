/**
 * EXML Parser — converts an XML element tree into a SkinIR.
 *
 * Walks the XML tree produced by the lightweight XML parser and
 * produces an intermediate representation ready for code generation.
 */

import { filterElements, getTextContent, parseXML } from './xml-parser.js';
import { isPropertyNode, localName, lookupComponent, parsePropertyNode } from './registry.js';
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
	UnresolvedTag,
} from './ast.js';
import type { NamespaceModule } from './registry.js';
import type { XElement } from './xml-parser.js';

// ── Public API ───────────────────────────────────────────────────────

/**
 * Parses an EXML source string into a skin intermediate representation.
 *
 * @param source - EXML source text.
 * @param className - Optional class name used for the generated factory.
 * @param customNamespaces - Project-defined EXML namespaces.
 * @returns The parsed skin intermediate representation.
 */
export function parseEXML(
	source: string,
	className?: string,
	customNamespaces: readonly NamespaceModule[] = [],
): SkinIR {
	const root = parseXML(source);
	const ir = parseSkinRoot(root, customNamespaces);
	return className ? { ...ir, className } : ir;
}

/**
 * Converts an already-parsed XML root into a skin intermediate representation.
 *
 * @param root - Parsed XML root element.
 * @param customNamespaces - Project-defined EXML namespaces.
 * @returns The parsed skin intermediate representation.
 */
export function parseSkinRoot(root: XElement, customNamespaces: readonly NamespaceModule[] = []): SkinIR {
	const ctx = new ParseContext(customNamespaces);
	ctx.processRoot(root);
	return ctx.toIR();
}

// ── Parse context ────────────────────────────────────────────────────

class ParseContext {
	// ── Instance fields ───────────────────────────────────────────────

	private readonly _imports = new Map<string, string>();
	private readonly _skinParts: string[] = [];
	private readonly _allNodes: SkinNode[] = [];
	private readonly _states: StateDef[] = [];
	private readonly _declarations: SkinNode[] = [];
	private readonly _unresolvedTags: UnresolvedTag[] = [];
	private readonly _rootProperties: PropertyAssignment[] = [];
	private readonly _idSet = new Set<string>();
	private _className = '';
	private _width?: PropertyValue;
	private _height?: PropertyValue;
	private _varCounter = 0;

	// ── Constructor ───────────────────────────────────────────────────

	public constructor(private readonly _customNamespaces: readonly NamespaceModule[]) {}

	// ── Public methods ────────────────────────────────────────────────

	/**
	 * Processes the root `<eui:Skin>` element.
	 */
	public processRoot(root: XElement): void {
		const rootClass = localName(root.name);
		if (rootClass !== 'Skin') {
			throw new Error(`EXML: expected root element to be Skin, got "${rootClass}"`);
		}

		this.addImport('Skin', '@kurot/ui');

		for (const attr of root.attributes) {
			if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:')) continue;
			if (attr.name === 'class') {
				this._className = attr.value;
			} else if (attr.name === 'width') {
				this._width = this.parseValue(attr.value);
			} else if (attr.name === 'height') {
				this._height = this.parseValue(attr.value);
			} else if (attr.name === 'states') {
				const stateNames = attr.value
					.split(',')
					.map(s => s.trim())
					.filter(Boolean);
				for (const name of stateNames) {
					if (!this._states.find(s => s.name === name)) {
						this._states.push({ name, stateGroups: [], overrides: [] });
					}
				}
			} else {
				const dotIndex = attr.name.indexOf('.');
				this._rootProperties.push({
					name: dotIndex >= 0 ? attr.name.substring(0, dotIndex) : attr.name,
					state: dotIndex >= 0 ? attr.name.substring(dotIndex + 1) : '',
					value: this.parseValue(attr.value),
				});
			}
		}

		// State names must exist before node attributes generate their overrides.
		const childElements = filterElements(root.children);
		this.collectStates(childElements);

		for (const el of childElements) {
			const cls = localName(el.name);
			const isPropNode = isPropertyNode(el.name);
			const isLowerProp = cls.length > 0 && cls[0] === cls[0].toLowerCase();

			if (isPropNode || isLowerProp) continue;

			if (cls === 'Declarations') {
				this.processDeclarations(el);
				continue;
			}

			const node = this.parseNode(el);
			if (node) {
				this._allNodes.push(node);
			}
		}

		this.collectStateOverrides();
	}

	/**
	 * Returns the completed immutable-facing skin representation.
	 */
	public toIR(): SkinIR {
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
			properties: this._rootProperties,
			imports: this._imports,
			skinParts: this._skinParts,
			children: this._allNodes,
			propertyChildren: [],
			states: this._states,
			declarations: this._declarations,
			unresolvedTags: this._unresolvedTags,
		};
	}

	// ── Private methods ───────────────────────────────────────────────

	/**
	 * Collect state definitions from children.
	 *
	 * Handles both direct `<eui:State>` children and `<eui:states>` property
	 * children.
	 */
	private collectStates(childElements: XElement[]): void {
		for (const el of childElements) {
			const cls = localName(el.name);

			if (cls === 'State') {
				this._states.push(this.parseState(el));
				continue;
			}

			const isLowerProp = cls.length > 0 && cls[0] === cls[0].toLowerCase();
			if (isLowerProp || isPropertyNode(el.name)) {
				for (const child of filterElements(el.children)) {
					const childCls = localName(child.name);
					if (childCls === 'State') {
						this._states.push(this.parseState(child));
					}
				}
			}
		}
	}

	private processDeclarations(el: XElement): void {
		const children = filterElements(el.children);
		for (const child of children) {
			const node = this.parseNode(child);
			if (node) {
				this._declarations.push(node);
			}
		}
	}

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

	private parseAddItems(el: XElement): StateAddItems {
		return {
			type: 'AddItems',
			targetId: this.getAttr(el, 'target') ?? '',
			destinationId: this.getAttr(el, 'destination') ?? '',
			position: Number.parseInt(this.getAttr(el, 'position') ?? '-1', 10),
			propertyName: this.getAttr(el, 'propertyName') ?? '',
		};
	}

	private parseSetProperty(el: XElement): StateSetProperty {
		const rawValue = this.getAttr(el, 'value') ?? '';
		return {
			type: 'SetProperty',
			targetId: this.getAttr(el, 'target') ?? '',
			name: this.getAttr(el, 'name') ?? '',
			value: this.parseValue(rawValue),
		};
	}

	private parseNode(el: XElement): SkinNode | undefined {
		const cls = localName(el.name);
		const info = lookupComponent(el.name, this._customNamespaces);

		if (!info) {
			// Unknown nodes remain diagnostic data but never enter generated code.
			this._unresolvedTags.push({ name: el.name, range: el.range });
			return undefined;
		}

		this.addImport(cls, info.module);

		const id = this.getAttr(el, 'id');
		if (id) {
			if (this._idSet.has(id)) {
				throw new Error(`EXML: duplicate id "${id}" in skin`);
			}
			this._idSet.add(id);
		}
		const varName = id || this.genVar(cls);

		if (id) {
			this._skinParts.push(id);
		}

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

			if (attrName === 'id' || attrName === 'includeIn' || attrName === 'excludeFrom') continue;

			// Dotted attributes target a named skin state, for example `label.up`.
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
					const text = getTextContent(child.children).trim();
					if (text) {
						childNodes.push(text);
					}
					for (const sub of filterElements(child.children)) {
						const node = this.parseNode(sub);
						if (node) {
							childNodes.push(node);
						}
					}
					propertyChildren.push({
						propertyName,
						nodes: childNodes,
					});
				}
				continue;
			}

			// Ordinary children are assigned through the component's default property.
			const childNode = this.parseNode(child);
			if (childNode) {
				children.push(childNode);
			}
		}

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
	 * Coerces EXML attributes in protocol order: binding, percent, boolean,
	 * `null`, number, then string.
	 */
	private parseValue(raw: string): PropertyValue {
		const bindingMatch = raw.match(/^\{(.+)\}$/);
		if (bindingMatch) {
			return { type: 'binding', expression: bindingMatch[1].trim() };
		}

		if (raw.endsWith('%')) {
			const num = Number.parseFloat(raw);
			if (!Number.isNaN(num)) {
				return { type: 'percent', value: num };
			}
		}

		if (raw === 'true') return { type: 'literal', value: true };
		if (raw === 'false') return { type: 'literal', value: false };

		if (raw === 'null') return { type: 'literal', value: null };

		const num = Number(raw);
		if (raw !== '' && !Number.isNaN(num)) {
			return { type: 'literal', value: num };
		}

		// Egret EXML treats the two-character `\n` sequence in string
		// attributes as a hard line break before generating runtime code.
		return { type: 'literal', value: raw.replace(/\\n/g, '\n') };
	}

	/**
	 * Converts `includeIn` and `excludeFrom` membership into `AddItems` overrides.
	 */
	private collectStateOverrides(): void {
		for (const node of this._allNodes) {
			const includedStates =
				node.includeIn.length > 0
					? node.includeIn
					: node.excludeFrom.length > 0
						? this._states.map(state => state.name).filter(name => !node.excludeFrom.includes(name))
						: [];
			if (includedStates.length > 0) {
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

	private addStateOverride(stateName: string, override: StateOverride): void {
		const state = this._states.find(s => s.name === stateName);
		if (state) {
			(state as { overrides: StateOverride[] }).overrides.push(override);
		}
	}

	private genVar(base: string): string {
		return `_${base.charAt(0).toLowerCase() + base.slice(1)}${++this._varCounter}`;
	}

	private getAttr(el: XElement, name: string): string | undefined {
		return el.attributes.find(a => a.name === name)?.value;
	}

	private addImport(className: string, module: string): void {
		this._imports.set(className, module);
	}

}
