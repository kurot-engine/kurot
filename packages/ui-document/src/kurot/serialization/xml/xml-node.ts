import type { UIComponentInstance, UIInstanceOverride } from '../../model/UIComponentInstance.js';
import type { UIAppearanceReference } from '../../model/UIReference.js';
import type { UINode } from '../../model/UINode.js';
import type { UIPropertyValue } from '../../model/UIPropertyValue.js';
import { compareStrings } from '../../shared/strings.js';
import type { XMLElement } from './xml-parser.js';
import {
	decodeXMLValue,
	encodeXMLValue,
	escapeXML,
	parseComplexValue,
	serializeComplexValue,
} from './xml-values.js';

const RESERVED_ATTRIBUTES = new Set(['appearance', 'appearanceVariant', 'id', 'xmlns']);

export interface XMLNamespaces {
	readonly prefixes: Readonly<Record<string, string>>;
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
	if (node.instance) {
		for (const nodes of Object.values(node.instance.slots)) {
			for (const child of nodes) {
				collectNodePrefixes(child, prefixes);
			}
		}
	}
}

/**
 * Serializes one semantic node using component tags.
 */
export function serializeNode(node: UINode, depth: number): string[] {
	const indent = '    '.repeat(depth);
	const tag = componentTag(node.type);
	const attributes = [`id="${escapeXML(node.id)}"`];
	const complex: [string, UIPropertyValue][] = [];

	if (node.appearance) {
		attributes.push(`appearance="${escapeXML(node.appearance.assetId)}"`);
		if (node.appearance.variant !== undefined) {
			attributes.push(`appearanceVariant="${escapeXML(node.appearance.variant)}"`);
		}
	}

	for (const [name, value] of sortedEntries(node.properties)) {
		const encoded = encodeXMLValue(value);
		if (encoded === undefined || RESERVED_ATTRIBUTES.has(name) || name.startsWith('xmlns')) {
			complex.push([name, value]);
		} else {
			attributes.push(`${name}="${escapeXML(encoded)}"`);
		}
	}

	if (complex.length === 0 && node.instance === undefined && node.children.length === 0) {
		return [`${indent}<${tag} ${attributes.join(' ')} />`];
	}

	const lines = [`${indent}<${tag} ${attributes.join(' ')}>`];
	if (complex.length > 0) {
		lines.push(`${indent}    <properties>`);
		for (const [name, value] of complex) {
			const encoded = encodeXMLValue(value);
			if (encoded !== undefined) {
				lines.push(`${indent}        <property name="${escapeXML(name)}" value="${escapeXML(encoded)}" />`);
			} else {
				lines.push(`${indent}        <property name="${escapeXML(name)}">`);
				lines.push(...serializeComplexValue(value, depth + 3));
				lines.push(`${indent}        </property>`);
			}
		}
		lines.push(`${indent}    </properties>`);
	}
	if (node.instance) lines.push(...serializeInstance(node.instance, depth + 1));
	for (const child of node.children) {
		lines.push(...serializeNode(child, depth + 1));
	}
	lines.push(`${indent}</${tag}>`);
	return lines;
}

/**
 * Parses one component element into a semantic node.
 */
export function parseNode(element: XMLElement, namespaces: XMLNamespaces): UINode {
	const id = requiredAttribute(element, 'id');
	const properties: Record<string, UIPropertyValue> = {};
	let appearance: UIAppearanceReference | undefined;
	let instance: UIComponentInstance | undefined;
	const children: UINode[] = [];

	const appearanceId = element.attributes.appearance;
	if (appearanceId !== undefined) {
		appearance = {
			kind: 'asset',
			assetId: appearanceId,
			...(element.attributes.appearanceVariant === undefined
				? {}
				: { variant: element.attributes.appearanceVariant }),
		};
	}

	for (const [name, value] of Object.entries(element.attributes)) {
		if (RESERVED_ATTRIBUTES.has(name) || name.startsWith('xmlns:')) continue;
		properties[name] = decodeXMLValue(value);
	}

	for (const child of element.children) {
		if (child.name === 'properties') {
			parseProperties(child, properties);
		} else if (child.name === 'instance') {
			if (instance !== undefined) throw new Error(`<${element.name}> contains duplicate <instance> metadata.`);
			instance = parseInstance(child, namespaces);
		} else {
			children.push(parseNode(child, namespaces));
		}
	}

	return {
		id,
		type: componentType(element.name, namespaces),
		properties,
		...(instance === undefined ? {} : { instance }),
		...(appearance === undefined ? {} : { appearance }),
		children,
	};
}

function serializeInstance(instance: UIComponentInstance, depth: number): string[] {
	const indent = '    '.repeat(depth);
	const variant = instance.variant === undefined ? '' : ` variant="${escapeXML(instance.variant)}"`;
	const lines = [`${indent}<instance source="${escapeXML(instance.source.assetId)}"${variant}>`];
	for (const [name, value] of sortedEntries(instance.parameters)) {
		lines.push(...serializeNamedValue('parameter', name, value, depth + 1));
	}
	for (const override of instance.overrides) {
		lines.push(...serializeOverride(override, depth + 1));
	}
	for (const [name, nodes] of sortedEntries(instance.slots)) {
		lines.push(`${indent}    <slot name="${escapeXML(name)}">`);
		for (const node of nodes) {
			lines.push(...serializeNode(node, depth + 2));
		}
		lines.push(`${indent}    </slot>`);
	}
	lines.push(`${indent}</instance>`);
	return lines;
}

function parseInstance(element: XMLElement, namespaces: XMLNamespaces): UIComponentInstance {
	const parameters: Record<string, UIPropertyValue> = {};
	const overrides: UIInstanceOverride[] = [];
	const slots: Record<string, UINode[]> = {};
	for (const child of element.children) {
		if (child.name === 'parameter') {
			parameters[requiredAttribute(child, 'name')] = parseNamedValue(child);
		} else if (child.name === 'override') {
			overrides.push({
				part: requiredAttribute(child, 'part'),
				property: requiredAttribute(child, 'property'),
				value: parseNamedValue(child),
			});
		} else if (child.name === 'slot') {
			const name = requiredAttribute(child, 'name');
			slots[name] = child.children.map(node => parseNode(node, namespaces));
		} else {
			throw new Error(`Unexpected <${child.name}> inside <instance>.`);
		}
	}
	return {
		source: { kind: 'asset', assetId: requiredAttribute(element, 'source') },
		parameters,
		...(element.attributes.variant === undefined ? {} : { variant: element.attributes.variant }),
		overrides,
		slots,
	};
}

function serializeOverride(override: UIInstanceOverride, depth: number): string[] {
	const attributes = `part="${escapeXML(override.part)}" property="${escapeXML(override.property)}"`;
	return serializeValueElement('override', attributes, override.value, depth);
}

function serializeNamedValue(tag: string, name: string, value: UIPropertyValue, depth: number): string[] {
	return serializeValueElement(tag, `name="${escapeXML(name)}"`, value, depth);
}

function serializeValueElement(tag: string, attributes: string, value: UIPropertyValue, depth: number): string[] {
	const indent = '    '.repeat(depth);
	const encoded = encodeXMLValue(value);
	if (encoded !== undefined) {
		return [`${indent}<${tag} ${attributes} value="${escapeXML(encoded)}" />`];
	}
	return [
		`${indent}<${tag} ${attributes}>`,
		...serializeComplexValue(value, depth + 1),
		`${indent}</${tag}>`,
	];
}

function parseProperties(element: XMLElement, properties: Record<string, UIPropertyValue>): void {
	for (const child of element.children) {
		if (child.name !== 'property') throw new Error(`Unexpected <${child.name}> inside <properties>.`);
		properties[requiredAttribute(child, 'name')] = parseNamedValue(child);
	}
}

function parseNamedValue(element: XMLElement): UIPropertyValue {
	if (element.attributes.value !== undefined) return decodeXMLValue(element.attributes.value);
	if (element.children.length !== 1 || element.children[0] === undefined) {
		throw new Error(`<${element.name}> requires a value attribute or one complex value.`);
	}
	return parseComplexValue(element.children[0]);
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
	if (!Object.hasOwn(namespaces.prefixes, prefix)) throw new Error(`Undeclared component namespace prefix "${prefix}".`);
	return `${prefix}.${tag.slice(separator + 1)}`;
}

function requiredAttribute(element: XMLElement, name: string): string {
	const value = element.attributes[name];
	if (value === undefined || value.length === 0) throw new Error(`<${element.name}> requires ${name}.`);
	return value;
}

function sortedEntries<T>(record: Readonly<Record<string, T>>): [string, T][] {
	return Object.entries(record).sort(([left], [right]) => compareStrings(left, right));
}
