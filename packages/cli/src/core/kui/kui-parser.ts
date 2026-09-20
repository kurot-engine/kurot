import {
	isUIAssetReference,
	isUIDesignTokenReference,
	isUIResourceReference,
	isSyntheticNodeId,
	parseUIDocument,
} from '@kurot/ui-document';
import type { UIDocument, UINode, UIPropertyValue } from '@kurot/ui-document';
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

/**
 * Parses a KUI Skin document into the existing skin code-generation IR.
 */
export function parseKUISkin(
	source: string,
	className: string | undefined,
	customNamespaces: readonly NamespaceModule[] = [],
): SkinIR {
	const document = parseUIDocument(source);
	return new KUIParseContext(source, document, className ?? document.id, customNamespaces).parse();
}

class KUIParseContext {
	private readonly _imports = new Map<string, string>([['Skin', '@kurot/ui']]);
	private readonly _skinParts: string[] = [];
	private readonly _unresolvedTags: UnresolvedTag[] = [];
	private _variable = 0;

	public constructor(
		private readonly _source: string,
		private readonly _document: UIDocument,
		private readonly _className: string,
		private readonly _customNamespaces: readonly NamespaceModule[],
	) {}

	public parse(): SkinIR {
		const root = this._document.root;
		if (root.type !== 'kui.Group') {
			throw new Error(`KUI Skin root component must be kui.Group, received ${root.type}.`);
		}
		const width = numericProperty(root.properties.width);
		const height = numericProperty(root.properties.height);
		const rootNode = this._node(root, false);
		return {
			className: this._className,
			...(width === undefined ? {} : { width }),
			...(height === undefined ? {} : { height }),
			properties: [],
			imports: this._imports,
			skinParts: this._skinParts,
			children: rootNode === undefined ? [] : [rootNode],
			propertyChildren: [],
			states: this._states(),
			declarations: [],
			unresolvedTags: this._unresolvedTags,
		};
	}

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

		const propertyChildren: PropertyChild[] = [];
		const properties: PropertyAssignment[] = [];
		for (const [name, value] of Object.entries(node.properties)) {
			const semanticChild = this._semanticChild(name, value);
			if (semanticChild) {
				propertyChildren.push(semanticChild);
			} else {
				properties.push({ name, value: propertyValue(value) });
			}
		}
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

	private _semanticChild(name: string, value: UIPropertyValue): PropertyChild | undefined {
		if (!isPlainObject(value) || typeof value.type !== 'string') return undefined;
		const properties = isPlainObject(value.properties) ? value.properties : {};
		const node = this._node({
			id: `_${name}${this._variable + 1}`,
			type: value.type,
			properties,
			children: [],
		}, false);
		return node === undefined ? undefined : { propertyName: name, nodes: [node] };
	}

	private _states(): StateDef[] {
		return Object.entries(this._document.contract.states).map(([name, definition]) => ({
			name,
			overrides: definition.overrides.map(override => {
				if (override.transition !== undefined) {
					throw new Error(`Compiled KUI skins do not support transitions in state "${name}".`);
				}
				return {
					type: 'SetProperty' as const,
					targetId: override.targetId,
					name: override.property,
					value: propertyValue(override.value),
				};
			}),
		}));
	}
}

function propertyValue(value: UIPropertyValue): PropertyValue {
	if (typeof value === 'string' && value.endsWith('%')) {
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

function typeTag(type: string): string {
	const separator = type.indexOf('.');
	if (separator === -1) return type;
	const prefix = type.slice(0, separator);
	const name = type.slice(separator + 1);
	return prefix === 'kui' ? name : `${prefix}:${name}`;
}

function safeVariable(id: string, className: string, index: number): string {
	const candidate = id.replace(/[^A-Za-z0-9_$]/g, '_');
	if (/^[A-Za-z_$]/.test(candidate)) return candidate;
	return `_${className.charAt(0).toLowerCase()}${className.slice(1)}${index}`;
}

function sourceRange(source: string, tag: string): { start: number; end: number } {
	const start = Math.max(0, source.indexOf(`<${tag}`));
	return { start, end: start + tag.length + 1 };
}

function numericProperty(value: UIPropertyValue | undefined): number | undefined {
	return typeof value === 'number' ? value : undefined;
}

function isPlainObject(value: UIPropertyValue): value is { readonly [key: string]: UIPropertyValue } {
	return typeof value === 'object' && !Array.isArray(value);
}

function isSkinNode(node: SkinNode | undefined): node is SkinNode {
	return node !== undefined;
}
