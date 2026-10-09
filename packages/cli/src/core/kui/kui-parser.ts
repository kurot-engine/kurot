import {
	isUIAssetReference,
	isUIDesignTokenReference,
	isUIResourceReference,
	isSyntheticNodeId,
	parseUIDocument,
	resolveUIResourceDefaults,
	resolveUIStyleColors,
	resolveUILabelStyles,
} from '@kurot/ui-document';
import type { UIDocument, UINode, UIPropertyValue, UIResourceConfigEntry, UIStyleSheet } from '@kurot/ui-document';
import type {
	PropertyAssignment,
	PropertyChild,
	PropertyValue,
	SkinIR,
	SkinNode,
	StateDef,
	UnresolvedTag,
} from './ast.js';
import { localName, lookupComponent } from './registry.js';
import type { NamespaceModule } from './registry.js';
import { validateFlipProperties } from './validate-flip-properties.js';
import { validateTextComponents } from './validate-text-components.js';

/**
 * Parses a KUI Skin document into the existing skin code-generation IR.
 */
export function parseKUISkin(
	source: string,
	className?: string,
	customNamespaces: readonly NamespaceModule[] = [],
	resources: readonly UIResourceConfigEntry[] = [],
	colors?: Readonly<Record<string, number>>,
	styleSheet?: UIStyleSheet,
): SkinIR {
	const document = resolveUIStyleColors(
		resolveUILabelStyles(resolveUIResourceDefaults(parseUIDocument(source), resources), styleSheet),
		colors ?? styleSheet?.colors ?? {},
	);
	validateTextComponents(document);
	validateFlipProperties(document);
	return new KUIParseContext(source, document, className ?? document.id, customNamespaces).parse();
}

class KUIParseContext {
	private readonly _imports = new Map<string, string>([['Skin', '@kurot/ui']]);
	private readonly _skinParts: string[] = [];
	private readonly _unresolvedTags: UnresolvedTag[] = [];
	private _variable = 0;

	/**
	 * Creates the conversion context for a resolved UI document.
	 */
	public constructor(
		private readonly _source: string,
		private readonly _document: UIDocument,
		private readonly _className: string,
		private readonly _customNamespaces: readonly NamespaceModule[],
	) {}

	/**
	 * Builds the Skin IR from the document root and contract.
	 */
	public parse(): SkinIR {
		const root = this._document.root;

		if (root.type !== 'kui.Group') {
			throw new Error(`KUI Skin root component must be kui.Group, received ${root.type}.`);
		}

		const width = numericProperty(root.properties.width);
		const height = numericProperty(root.properties.height);
		const rootProperties = this._properties(root, new Set(['height', 'width']));

		return {
			className: this._className,
			...(width === undefined ? {} : { width }),
			...(height === undefined ? {} : { height }),
			properties: rootProperties.properties,
			imports: this._imports,
			skinParts: this._skinParts,
			children: root.children.map(child => this._node(child)).filter(isSkinNode),
			propertyChildren: rootProperties.propertyChildren,
			states: this._states(),
			declarations: [],
			unresolvedTags: this._unresolvedTags,
		};
	}

	/**
	 * Converts a supported node and records imports, Skin parts and unknown tags.
	 */
	private _node(node: UINode, exposeAsPart = true): SkinNode | undefined {
		if (node.instance !== undefined) {
			throw new Error(`KUI Skin node "${node.id}" cannot be a reusable component instance.`);
		}

		const tag = typeTag(node.type);
		const info = lookupComponent(tag, this._customNamespaces);

		if (!info) {
			this._unresolvedTags.push({ name: tag, range: sourceRange(this._source, tag) });
			return undefined;
		}

		const className = localName(tag);

		this._imports.set(className, info.module);

		if (exposeAsPart && !isSyntheticNodeId(node.id)) {
			this._skinParts.push(node.id);
		}

		const { properties, propertyChildren } = this._properties(node);

		return {
			className,
			module: info.module,
			varName: safeVariable(node.id, className, ++this._variable),
			id: node.id,
			properties,
			children: node.children.map(child => this._node(child)).filter(isSkinNode),
			propertyChildren,
		};
	}

	/**
	 * Separates native assignments from typed property-child objects.
	 */
	private _properties(
		node: UINode,
		excluded = new Set<string>(),
	): { properties: PropertyAssignment[]; propertyChildren: PropertyChild[] } {
		const properties: PropertyAssignment[] = [];
		const propertyChildren: PropertyChild[] = [];

		for (const [name, value] of Object.entries(node.properties)) {
			if (excluded.has(name)) continue;
			const semanticChild = this._semanticChild(name, value);
			if (semanticChild) {
				propertyChildren.push(semanticChild);
			} else {
				properties.push({ name, value: propertyValue(value, name) });
			}
		}

		return { properties, propertyChildren };
	}

	/**
	 * Converts a typed property object without exposing it as a Skin part.
	 */
	private _semanticChild(name: string, value: UIPropertyValue): PropertyChild | undefined {
		if (!isPlainObject(value) || typeof value.type !== 'string') return undefined;

		const properties = isPlainObject(value.properties) ? value.properties : {};
		const node = this._node(
			{
				id: `_${name}${this._variable + 1}`,
				type: value.type,
				properties,
				children: [],
			},
			false,
		);

		return node === undefined ? undefined : { propertyName: name, nodes: [node] };
	}

	/**
	 * Converts supported state overrides to runtime property assignments.
	 */
	private _states(): StateDef[] {
		return Object.entries(this._document.contract.states).map(([name, definition]) => ({
			name,
			overrides: definition.overrides.map(override => {
				if (override.transition !== undefined) {
					throw new Error(`Compiled KUI skins do not support transitions in state "${name}".`);
				}
				return {
					type: 'SetProperty' as const,
					targetId: override.targetId === this._document.root.id ? '' : override.targetId,
					name: override.property,
					value: propertyValue(override.value, override.property),
				};
			}),
		}));
	}
}

/**
 * Converts percentages and semantic references into compiler property values.
 */
function propertyValue(value: UIPropertyValue, name: string): PropertyValue {
	if ((name === 'width' || name === 'height') && typeof value === 'string' && value.endsWith('%')) {
		const percentage = Number.parseFloat(value);
		if (!Number.isNaN(percentage)) return { type: 'percent', value: percentage };
	}
	if (isUIResourceReference(value) || isUIDesignTokenReference(value)) {
		return { type: 'literal', value: value.key };
	}
	if (isUIAssetReference(value)) {
		return { type: 'literal', value: value.assetId };
	}

	return { type: 'literal', value };
}

/**
 * Maps document type names to built-in or namespaced KUI tags.
 */
function typeTag(type: string): string {
	const separator = type.indexOf('.');

	if (separator === -1) return type;

	const prefix = type.slice(0, separator);
	const name = type.slice(separator + 1);

	return prefix === 'kui' ? name : `${prefix}:${name}`;
}

/**
 * Produces a valid local variable name for a node.
 */
function safeVariable(id: string, className: string, index: number): string {
	const candidate = id.replace(/[^A-Za-z0-9_$]/g, '_');

	if (/^[A-Za-z_$]/.test(candidate)) return candidate;

	return `_${className.charAt(0).toLowerCase()}${className.slice(1)}${index}`;
}

/**
 * Locates a tag occurrence for unknown-component diagnostics.
 */
function sourceRange(source: string, tag: string): { start: number; end: number } {
	const start = Math.max(0, source.indexOf(`<${tag}`));
	return { start, end: start + tag.length + 1 };
}

/**
 * Extracts a numeric property without coercing other value types.
 */
function numericProperty(value: UIPropertyValue | undefined): number | undefined {
	return typeof value === 'number' ? value : undefined;
}

/**
 * Distinguishes object-valued document properties from arrays and primitives.
 */
function isPlainObject(value: UIPropertyValue): value is { readonly [key: string]: UIPropertyValue } {
	return typeof value === 'object' && !Array.isArray(value);
}

/**
 * Narrows converted nodes after unknown components are omitted.
 */
function isSkinNode(node: SkinNode | undefined): node is SkinNode {
	return node !== undefined;
}
