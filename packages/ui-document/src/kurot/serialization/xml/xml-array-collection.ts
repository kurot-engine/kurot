import type { UIPropertyValue } from '../../model/UIPropertyValue.js';
import { compareStrings } from '../../shared/strings.js';
import type { XMLElement } from './xml-parser.js';
import { decodeXMLValue, encodeXMLValue, escapeXML } from './xml-values.js';

const DATA_COMPONENTS = new Set(['kui.DataGroup', 'kui.List', 'kui.TabBar', 'kui.ComboBox']);

export function supportsArrayCollection(type: string): boolean {
	return DATA_COMPONENTS.has(type);
}

export function parseArrayCollection(element: XMLElement): UIPropertyValue {
	if (Object.keys(element.attributes).length > 0 || element.children.length !== 1) {
		throw new Error('<ArrayCollection> requires exactly one <Array> child and no attributes.');
	}
	const array = element.children[0];
	if (array?.name !== 'Array' || Object.keys(array.attributes).length > 0) {
		throw new Error('<ArrayCollection> requires exactly one <Array> child and no attributes.');
	}
	const source = array.children.map(item => {
		if (item.name !== 'Object' || item.children.length > 0) {
			throw new Error('<Array> accepts only <Object /> items.');
		}
		return Object.fromEntries(Object.entries(item.attributes).map(([name, source]) => {
			const value = decodeXMLValue(source);
			if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
				throw new Error(`<Object> property "${name}" must be a scalar attribute.`);
			}
			return [name, value];
		}));
	});
	return { type: 'kui.ArrayCollection', properties: { source } };
}

export function serializeArrayCollection(value: UIPropertyValue, depth: number): string[] {
	if (!isPropertyObject(value) || value.type !== 'kui.ArrayCollection') {
		throw new Error('Data provider must be a kui.ArrayCollection descriptor.');
	}
	const properties = value.properties;
	if (!isPropertyObject(properties) || Object.keys(properties).length !== 1 || !Array.isArray(properties.source)) {
		throw new Error('ArrayCollection descriptor requires only a source array.');
	}
	const indent = '    '.repeat(depth);
	const lines = [`${indent}<ArrayCollection>`, `${indent}    <Array>`];
	for (const item of properties.source) {
		if (!isPropertyObject(item)) {
			throw new Error('ArrayCollection source accepts only Object items.');
		}
		const attributes = Object.entries(item).sort(([left], [right]) => compareStrings(left, right)).map(([name, entry]) => {
			const encoded = encodeXMLValue(entry);
			if (encoded === undefined || !/^[A-Za-z_][\w:.-]*$/.test(name)) {
				throw new Error(`ArrayCollection item property "${name}" must be an XML scalar attribute.`);
			}
			return `${name}="${escapeXML(encoded)}"`;
		});
		lines.push(`${indent}        <Object${attributes.length ? ` ${attributes.join(' ')}` : ''} />`);
	}
	lines.push(`${indent}    </Array>`, `${indent}</ArrayCollection>`);
	return lines;
}

function isPropertyObject(value: UIPropertyValue | undefined): value is Readonly<Record<string, UIPropertyValue>> {
	return typeof value === 'object' && value !== null && !Array.isArray(value) && !('kind' in value);
}
