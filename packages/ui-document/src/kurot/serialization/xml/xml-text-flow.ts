import { isUITextFlow } from '../../model/UITextFlow.js';
import type { UIPropertyValue } from '../../model/UIPropertyValue.js';
import type { UITextFlow } from '../../model/UITextFlow.js';
import { compareStrings } from '../../shared/strings.js';
import type { XMLElement } from './xml-parser.js';
import { decodeXMLValue, encodeXMLValue, escapeXML } from './xml-values.js';

const STYLE_FIELDS = new Set(['bold', 'fontFamily', 'italic', 'size', 'stroke', 'strokeColor', 'textColor']);

/**
 * Parses one rich-text property element; Span elements are data, never display nodes.
 */
export function parseTextFlow(element: XMLElement): UITextFlow {
	if (Object.keys(element.attributes).length > 0) {
		throw new Error(`<${element.name}> does not accept attributes.`);
	}
	const runs = element.children.map(child => {
		if (child.name !== 'Span' || child.children.length > 0) {
			throw new Error(`<${element.name}> accepts only empty <Span text="..." /> elements.`);
		}
		if (child.attributes.text === undefined) {
			throw new Error('<Span> requires literal text, including an empty string when appropriate.');
		}
		const style: Record<string, UIPropertyValue> = {};
		for (const [key, value] of Object.entries(child.attributes)) {
			if (key === 'text') continue;
			if (!STYLE_FIELDS.has(key)) {
				throw new Error(`Unsupported rich-text style field "${key}".`);
			}
			style[key] = decodeXMLValue(value, styleDefinition(key));
		}
		return {
			text: child.attributes.text,
			...(Object.keys(style).length > 0 ? { style } : {}),
		};
	});
	if (!isUITextFlow(runs)) {
		throw new Error(`Invalid literal rich-text style in <${element.name}>.`);
	}
	return runs;
}

/**
 * Serializes a rich-text property while preserving run order and literal whitespace.
 * Empty style objects have the same native meaning as omission and are omitted.
 */
export function serializeTextFlow(value: UIPropertyValue, depth: number, name = 'textFlow'): string[] {
	if (!isUITextFlow(value)) {
		throw new Error(`Skin property "${name}" must contain valid literal text/style runs.`);
	}
	const indent = '    '.repeat(depth);
	if (value.length === 0) return [`${indent}<${name} />`];
	const lines = [`${indent}<${name}>`];
	for (const run of value) {
		const attributes = [`text="${escapeText(run.text)}"`];
		for (const [key, field] of Object.entries(run.style ?? {}).sort(([a], [b]) => compareStrings(a, b))) {
			const encoded = encodeXMLValue(field, styleDefinition(key));
			attributes.push(`${key}="${escapeText(encoded!)}"`);
		}
		lines.push(`${indent}    <Span ${attributes.join(' ')} />`);
	}
	lines.push(`${indent}</${name}>`);
	return lines;
}

function styleDefinition(key: string): { valueType: 'string' | 'number' | 'boolean'; format?: 'color' } {
	if (key === 'fontFamily') return { valueType: 'string' };
	if (key === 'textColor' || key === 'strokeColor') return { valueType: 'number', format: 'color' };
	if (key === 'bold' || key === 'italic') return { valueType: 'boolean' };
	return { valueType: 'number' };
}

function escapeText(value: string): string {
	return escapeXML(value).replaceAll('\r', '&#13;').replaceAll('\n', '&#10;').replaceAll('\t', '&#9;');
}
