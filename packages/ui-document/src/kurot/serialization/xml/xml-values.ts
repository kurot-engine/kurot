import type { UIPropertyObject, UIPropertyValue } from '../../model/UIPropertyValue.js';
import {
	isUIAssetReference,
	isUIDesignTokenReference,
	isUIResourceReference,
} from '../../model/UIReference.js';
import { compareStrings } from '../../shared/strings.js';
import type { XMLElement } from './xml-parser.js';

const NUMBER_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
const REFERENCE_PATTERN = /^@(asset|resource|token):/;

/**
 * Encodes a scalar or reference value for an XML attribute.
 */
export function encodeXMLValue(value: UIPropertyValue): string | undefined {
	if (typeof value === 'boolean' || typeof value === 'number') {
		return String(value);
	}
	if (typeof value === 'string') {
		return needsStringEscape(value) ? `\\${value}` : value;
	}
	if (isUIAssetReference(value)) {
		return `@asset:${value.assetId}`;
	}
	if (isUIResourceReference(value)) {
		return `@resource:${value.resourceType}:${value.key}`;
	}
	if (isUIDesignTokenReference(value)) {
		return `@token:${value.tokenType}:${value.key}`;
	}
	return undefined;
}

/**
 * Decodes the canonical scalar and reference attribute syntax.
 */
export function decodeXMLValue(source: string): UIPropertyValue {
	if (source.startsWith('\\')) return source.slice(1);
	if (source === 'true') return true;
	if (source === 'false') return false;
	if (NUMBER_PATTERN.test(source)) return Number(source);
	if (source.startsWith('@asset:')) {
		return { kind: 'asset', assetId: source.slice('@asset:'.length) };
	}
	if (source.startsWith('@resource:')) {
		const [resourceType, ...key] = source.slice('@resource:'.length).split(':');
		return { kind: 'resource', resourceType: resourceType ?? '', key: key.join(':') };
	}
	if (source.startsWith('@token:')) {
		const [tokenType, ...key] = source.slice('@token:'.length).split(':');
		return { kind: 'token', tokenType: tokenType ?? '', key: key.join(':') };
	}
	return source;
}

/**
 * Serializes an array or object property as explicit value elements.
 */
export function serializeComplexValue(value: UIPropertyValue, depth: number): string[] {
	const indent = '    '.repeat(depth);
	if (Array.isArray(value)) {
		return serializeCollection('array', value.map(item => ['', item] as const), depth);
	}
	const object = value as UIPropertyObject;
	const entries = Object.entries(object).sort(([left], [right]) => compareStrings(left, right));
	return serializeCollection('object', entries, depth);

	function serializeCollection(
		name: 'array' | 'object',
		items: readonly (readonly [string, UIPropertyValue])[],
		itemDepth: number,
	): string[] {
		const lines = [`${indent}<${name}>`];
		for (const [key, item] of items) {
			const encoded = encodeXMLValue(item);
			const keyAttribute = key === '' ? '' : ` name="${escapeXML(key)}"`;
			if (encoded !== undefined) {
				lines.push(`${'    '.repeat(itemDepth + 1)}<value${keyAttribute} value="${escapeXML(encoded)}" />`);
				continue;
			}
			lines.push(`${'    '.repeat(itemDepth + 1)}<value${keyAttribute}>`);
			lines.push(...serializeComplexValue(item, itemDepth + 2));
			lines.push(`${'    '.repeat(itemDepth + 1)}</value>`);
		}
		lines.push(`${indent}</${name}>`);
		return lines;
	}
}

/**
 * Parses one explicit array or object value element.
 */
export function parseComplexValue(element: XMLElement): UIPropertyValue {
	if (element.name === 'array') {
		return element.children.map(parseValueElement);
	}
	if (element.name === 'object') {
		const result: Record<string, UIPropertyValue> = {};
		for (const child of element.children) {
			const name = requiredAttribute(child, 'name');
			result[name] = parseValueElement(child);
		}
		return result;
	}
	throw new Error(`Expected <array> or <object>, received <${element.name}>.`);
}

/**
 * Escapes text for a double-quoted XML attribute.
 */
export function escapeXML(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
}

function parseValueElement(element: XMLElement): UIPropertyValue {
	if (element.name !== 'value') {
		throw new Error(`Expected <value>, received <${element.name}>.`);
	}
	const scalar = element.attributes.value;
	if (scalar !== undefined) {
		if (element.children.length > 0) {
			throw new Error('<value> cannot contain both a value attribute and child content.');
		}
		return decodeXMLValue(scalar);
	}
	const child = element.children[0];
	if (child === undefined || element.children.length !== 1) {
		throw new Error('<value> must contain exactly one <array> or <object>.');
	}
	return parseComplexValue(child);
}

function requiredAttribute(element: XMLElement, name: string): string {
	const value = element.attributes[name];
	if (value === undefined || value.length === 0) {
		throw new Error(`<${element.name}> requires a non-empty ${name} attribute.`);
	}
	return value;
}

function needsStringEscape(value: string): boolean {
	return value.startsWith('\\') || value === 'true' || value === 'false' || NUMBER_PATTERN.test(value) || REFERENCE_PATTERN.test(value);
}
