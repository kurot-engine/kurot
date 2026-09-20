import type { UIPropertyValue } from '../../model/UIPropertyValue.js';
import type { UIPropertyDefinition } from '../../schema/UIComponentDefinition.js';
import {
	isUIDesignTokenReference,
	isUIResourceReference,
} from '../../model/UIReference.js';

const NUMBER_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
const HEX_COLOR_PATTERN = /^(?:#|0x)([0-9a-f]{6})$/i;
const REFERENCE_PATTERN = /^@token:/;

/**
 * Encodes a scalar or reference value for an XML attribute.
 */
export function encodeXMLValue(
	value: UIPropertyValue,
	definition?: UIPropertyDefinition,
): string | undefined {
	if (typeof value === 'number' && definition?.format === 'color') {
		return `#${value.toString(16).padStart(6, '0').toUpperCase()}`;
	}
	if (typeof value === 'boolean' || typeof value === 'number') {
		return String(value);
	}
	if (typeof value === 'string') {
		return needsStringEscape(value) ? `\\${value}` : value;
	}
	if (isUIResourceReference(value)) {
		if (definition?.format === 'resource') {
			return value.key;
		}
		return undefined;
	}
	if (isUIDesignTokenReference(value)) {
		return `@token:${value.tokenType}:${value.key}`;
	}
	return undefined;
}

/**
 * Decodes the canonical scalar and reference attribute syntax.
 */
export function decodeXMLValue(
	source: string,
	definition?: UIPropertyDefinition,
): UIPropertyValue {
	if (source.startsWith('\\')) return source.slice(1);
	const color = definition?.format === 'color' ? HEX_COLOR_PATTERN.exec(source) : undefined;
	if (color?.[1] !== undefined) return Number.parseInt(color[1], 16);
	if (source === 'true') return true;
	if (source === 'false') return false;
	if (NUMBER_PATTERN.test(source)) return Number(source);
	if (source.startsWith('@asset:') || source.startsWith('@resource:')) {
		throw new Error('Skin XML uses direct component values instead of typed asset or resource prefixes.');
	}
	if (source.startsWith('@token:')) {
		const [tokenType, ...key] = source.slice('@token:'.length).split(':');
		return { kind: 'token', tokenType: tokenType ?? '', key: key.join(':') };
	}
	if (definition?.format === 'resource') {
		return {
			kind: 'resource',
			resourceType: definition.resourceTypes?.[0] ?? 'image',
			key: source,
		};
	}
	return source;
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

function needsStringEscape(value: string): boolean {
	return value.startsWith('\\') || value === 'true' || value === 'false' || NUMBER_PATTERN.test(value) || REFERENCE_PATTERN.test(value);
}
