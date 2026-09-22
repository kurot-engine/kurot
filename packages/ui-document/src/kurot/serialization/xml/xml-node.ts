import type { UIPropertyOverride, UIStateDefinition } from '../../model/UIAssetContract.js';
import type { UINode } from '../../model/UINode.js';
import type { UIPropertyValue } from '../../model/UIPropertyValue.js';
import { createSyntheticNodeId, isSyntheticNodeId } from '../../model/synthetic-node-id.js';
import { createKurotUIFoundationRegistry } from '../../catalog/kurot-ui-foundation.js';
import { compareStrings } from '../../shared/strings.js';
import type { XMLElement } from './xml-parser.js';
import { decodeXMLValue, encodeXMLValue, escapeXML } from './xml-values.js';

const RESERVED_ATTRIBUTES = new Set(['id', 'xmlns']);
const FOUNDATION_COMPONENTS = createKurotUIFoundationRegistry();
const LAYOUT_TYPES = new Set(['BasicLayout', 'HorizontalLayout', 'TileLayout', 'VerticalLayout']);
const PERCENT_SIZE_PROPERTIES = {
	percentHeight: 'height',
	percentWidth: 'width',
} as const;
const SIZE_PERCENT_PROPERTIES = {
	height: 'percentHeight',
	width: 'percentWidth',
} as const;
const PERCENT_SIZE_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?%$/;

export interface XMLNamespaces {
	readonly prefixes: Readonly<Record<string, string>>;
}

export interface XMLNodeParseContext extends XMLNamespaces {
	readonly states: ReadonlySet<string>;
	readonly stateOverrides: Map<string, UIPropertyOverride[]>;
}

export interface XMLSkinRootSerialization {
	readonly attributes: readonly string[];
	readonly contents: readonly string[];
}

/**
 * Collects custom component namespace prefixes used by a node tree.
 */
export function collectNodePrefixes(node: UINode, prefixes: Set<string>): void {
	const separator = node.type.indexOf('.');
	const prefix = separator === -1 ? 'kui' : node.type.slice(0, separator);
	if (prefix !== 'kui') prefixes.add(prefix);
	for (const child of node.children) {
		collectNodePrefixes(child, prefixes);
	}
}

/**
 * Serializes one semantic node using component tags.
 */
export function serializeNode(
	node: UINode,
	depth: number,
	states: Readonly<Record<string, UIStateDefinition>> = {},
): string[] {
	const indent = '    '.repeat(depth);
	const tag = componentTag(node.type);
	const { attributes, layout } = serializeNodeMetadata(node, states, true);

	const attributeSuffix = attributes.length === 0 ? '' : ` ${attributes.join(' ')}`;

	if (layout === undefined && node.children.length === 0) {
		return [`${indent}<${tag}${attributeSuffix} />`];
	}

	const lines = [`${indent}<${tag}${attributeSuffix}>`];
	if (layout !== undefined) {
		lines.push(...serializeLayout(layout, depth + 1));
	}
	for (const child of node.children) {
		lines.push(...serializeNode(child, depth + 1, states));
	}
	lines.push(`${indent}</${tag}>`);
	return lines;
}

/**
 * Serializes the implicit Group represented by the Skin element itself.
 */
export function serializeSkinRoot(
	node: UINode,
	states: Readonly<Record<string, UIStateDefinition>> = {},
): XMLSkinRootSerialization {
	if (node.type !== 'kui.Group') {
		throw new Error('Skin document root must be an implicit kui.Group.');
	}
	const { attributes, layout } = serializeNodeMetadata(node, states, false);
	const contents: string[] = [];
	if (layout !== undefined) {
		contents.push(...serializeLayout(layout, 1));
	}
	for (const child of node.children) {
		contents.push(...serializeNode(child, 1, states));
	}
	return { attributes, contents };
}

/**
 * Parses one component element into a semantic node.
 */
export function parseNode(element: XMLElement, context: XMLNodeParseContext, path = '0'): UINode {
	const authoredId = element.attributes.id;
	if (authoredId !== undefined && isSyntheticNodeId(authoredId)) {
		throw new Error(`Skin component id "${authoredId}" uses a reserved internal prefix.`);
	}
	const id = authoredId ?? createSyntheticNodeId(path);
	const type = componentType(element.name, context);
	const properties: Record<string, UIPropertyValue> = {};
	const children: UINode[] = [];

	for (const [name, value] of Object.entries(element.attributes)) {
		if (RESERVED_ATTRIBUTES.has(name) || name.startsWith('xmlns:')) continue;
		if (name === 'appearance' || name === 'appearanceVariant') {
			throw new Error(`Skin component <${element.name}> does not support ${name}.`);
		}
		const stateSeparator = name.lastIndexOf('.');
		if (stateSeparator !== -1) {
			const authoredProperty = name.slice(0, stateSeparator);
			const stateName = name.slice(stateSeparator + 1);
			if (authoredProperty.length === 0 || !context.states.has(stateName)) {
				throw new Error(`State property "${name}" references an undeclared state.`);
			}
			const overrides = context.stateOverrides.get(stateName);
			if (overrides === undefined) {
				throw new Error(`State "${stateName}" has no override collection.`);
			}
			const property = decodeSizeProperty(type, authoredProperty, value);
			overrides.push({
				targetId: id,
				property: property.name,
				value: property.value,
			});
			continue;
		}
		const property = decodeSizeProperty(type, name, value);
		properties[property.name] = property.value;
	}

	let childIndex = 0;
	for (const child of element.children) {
		if (child.name === 'layout') {
			if (properties.layout !== undefined) {
				throw new Error(`<${element.name}> contains duplicate layout metadata.`);
			}
			properties.layout = parseLayout(child);
		} else if (child.name === 'properties' || child.name === 'instance') {
			throw new Error(`<${child.name}> is not Skin XML syntax.`);
		} else {
			children.push(parseNode(child, context, `${path}.${childIndex}`));
			childIndex++;
		}
	}

	return {
		id,
		type,
		properties,
		children,
	};
}

/**
 * Parses Skin attributes and direct children as one implicit Group node.
 */
export function parseSkinRoot(element: XMLElement, context: XMLNodeParseContext): UINode {
	const attributes = Object.fromEntries(
		Object.entries(element.attributes).filter(
			([name]) => name !== 'class' && name !== 'states' && name !== 'xmlns' && !name.startsWith('xmlns:'),
		),
	);
	return parseNode({ name: 'Group', attributes, children: element.children }, context);
}

function serializeNodeMetadata(
	node: UINode,
	states: Readonly<Record<string, UIStateDefinition>>,
	includeId: boolean,
): { attributes: string[]; layout?: UIPropertyValue } {
	const attributes = includeId && !isSyntheticNodeId(node.id) ? [`id="${escapeXML(node.id)}"`] : [];
	const stateProperties = new Set<string>();
	let layout: UIPropertyValue | undefined;

	if (node.appearance !== undefined || node.instance !== undefined) {
		throw new Error('Skin XML nodes do not serialize semantic asset composition metadata.');
	}

	for (const [name, value] of sortedEntries(node.properties)) {
		if (name === 'layout') {
			layout = value;
			continue;
		}
		if (name.includes('.')) {
			throw new Error(`Skin property name "${name}" must not contain a dot.`);
		}
		const property = encodeSizeProperty(node, name, value, true);
		if (
			property.value === undefined ||
			RESERVED_ATTRIBUTES.has(property.name) ||
			property.name.startsWith('xmlns')
		) {
			throw new Error(`Skin property "${name}" must be a scalar value.`);
		}
		attributes.push(`${property.name}="${escapeXML(property.value)}"`);
	}

	for (const [stateName, state] of Object.entries(states)) {
		for (const override of state.overrides) {
			if (override.targetId !== node.id) continue;
			if (override.property.includes('.')) {
				throw new Error(`Skin state property name "${override.property}" must not contain a dot.`);
			}
			const property = encodeSizeProperty(node, override.property, override.value);
			const stateProperty = `${property.name}.${stateName}`;
			if (stateProperties.has(stateProperty)) {
				throw new Error(`Skin XML cannot serialize duplicate state property "${stateProperty}".`);
			}
			stateProperties.add(stateProperty);
			if (override.transition !== undefined) {
				throw new Error(`Skin XML does not serialize transitions for state "${stateName}".`);
			}
			if (property.value === undefined) {
				throw new Error(`State property "${override.property}.${stateName}" must be a scalar value.`);
			}
			attributes.push(`${stateProperty}="${escapeXML(property.value)}"`);
		}
	}

	return layout === undefined ? { attributes } : { attributes, layout };
}

function serializeLayout(value: UIPropertyValue, depth: number): string[] {
	const descriptor = requirePropertyObject(value, 'Layout descriptor');
	const type = descriptor.type;
	if (typeof type !== 'string' || !type.startsWith('kui.')) {
		throw new Error('Layout descriptor requires a kui.* type.');
	}
	const name = type.slice('kui.'.length);
	if (!LAYOUT_TYPES.has(name)) {
		throw new Error(`Unsupported layout type "${type}".`);
	}
	const properties =
		descriptor.properties === undefined ? {} : requirePropertyObject(descriptor.properties, 'Layout properties');
	const attributes: string[] = [];
	for (const [property, propertyValue] of sortedEntries(properties)) {
		const encoded = encodeXMLValue(propertyValue);
		if (encoded === undefined) {
			throw new Error(`Layout property "${property}" must be a scalar value.`);
		}
		attributes.push(`${property}="${escapeXML(encoded)}"`);
	}
	const indent = '    '.repeat(depth);
	const suffix = attributes.length === 0 ? '' : ` ${attributes.join(' ')}`;
	return [`${indent}<layout>`, `${indent}    <${name}${suffix} />`, `${indent}</layout>`];
}

function parseLayout(element: XMLElement): UIPropertyValue {
	if (Object.keys(element.attributes).length > 0) {
		throw new Error('<layout> does not accept attributes.');
	}
	if (element.children.length !== 1 || element.children[0] === undefined) {
		throw new Error('<layout> requires exactly one layout component.');
	}
	const layout = element.children[0];
	if (!LAYOUT_TYPES.has(layout.name)) {
		throw new Error(`Unsupported layout component <${layout.name}>.`);
	}
	if (layout.children.length > 0) {
		throw new Error(`<${layout.name}> cannot contain child elements.`);
	}
	const properties: Record<string, UIPropertyValue> = {};
	for (const [name, value] of Object.entries(layout.attributes)) {
		properties[name] = decodeXMLValue(value);
	}
	return {
		type: `kui.${layout.name}`,
		properties,
	};
}

function requirePropertyObject(value: UIPropertyValue, label: string): Readonly<Record<string, UIPropertyValue>> {
	if (typeof value !== 'object' || Array.isArray(value) || 'kind' in value) {
		throw new Error(`${label} must be an object.`);
	}
	return value as Readonly<Record<string, UIPropertyValue>>;
}

function componentTag(type: string): string {
	const separator = type.indexOf('.');
	if (separator === -1) return type;
	const prefix = type.slice(0, separator);
	const name = type.slice(separator + 1);
	return prefix === 'kui' ? name : `${prefix}:${name}`;
}

function componentType(tag: string, namespaces: XMLNamespaces): string {
	const separator = tag.indexOf(':');
	if (separator === -1) return `kui.${tag}`;
	const prefix = tag.slice(0, separator);
	if (!Object.hasOwn(namespaces.prefixes, prefix))
		throw new Error(`Undeclared component namespace prefix "${prefix}".`);
	return `${prefix}.${tag.slice(separator + 1)}`;
}

function sortedEntries<T>(record: Readonly<Record<string, T>>): [string, T][] {
	return Object.entries(record).sort(([left], [right]) => compareStrings(left, right));
}

function propertyDefinition(type: string, property: string) {
	return FOUNDATION_COMPONENTS.resolve(type)?.properties[property];
}

function decodeSizeProperty(
	type: string,
	name: string,
	source: string,
): { name: string; value: UIPropertyValue } {
	if (name === 'percentWidth' || name === 'percentHeight') {
		throw new Error(`Skin XML uses ${PERCENT_SIZE_PROPERTIES[name]}="...%" instead of ${name}.`);
	}
	if ((name === 'width' || name === 'height') && source.endsWith('%')) {
		if (!PERCENT_SIZE_PATTERN.test(source)) {
			throw new Error(`Skin property "${name}" has an invalid percentage value "${source}".`);
		}
		const percentProperty = SIZE_PERCENT_PROPERTIES[name];
		return {
			name: percentProperty,
			value: Number(source.slice(0, -1)),
		};
	}
	return {
		name,
		value: decodeXMLValue(source, propertyDefinition(type, name)),
	};
}

function encodeSizeProperty(
	node: UINode,
	name: string,
	value: UIPropertyValue,
	checkNodeConflict = false,
): { name: string; value: string | undefined } {
	if (name === 'percentWidth' || name === 'percentHeight') {
		const sizeProperty = PERCENT_SIZE_PROPERTIES[name];
		if (checkNodeConflict && node.properties[sizeProperty] !== undefined) {
			throw new Error(`Skin component cannot define both ${sizeProperty} and ${name}.`);
		}
		const encoded = encodeXMLValue(value, propertyDefinition(node.type, name));
		return { name: sizeProperty, value: encoded === undefined ? undefined : `${encoded}%` };
	}
	return { name, value: encodeXMLValue(value, propertyDefinition(node.type, name)) };
}
