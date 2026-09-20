import type {
	UIAssetContract,
	UIPropertyOverride,
} from '../../model/UIAssetContract.js';
import type { UIPropertyValue } from '../../model/UIPropertyValue.js';
import type { UIPropertyDefinition } from '../../schema/UIComponentDefinition.js';
import { compareStrings } from '../../shared/strings.js';
import { encodeXMLValue, escapeXML, serializeComplexValue } from './xml-values.js';

/**
 * Serializes the public contract of one UI asset.
 */
export function serializeContract(contract: UIAssetContract, depth: number): string[] {
	const indent = '    '.repeat(depth);
	const lines = [`${indent}<contract>`];

	appendDefinitions(lines, 'parameters', contract.parameters, depth + 1, (name, value, itemDepth) => {
		const itemIndent = '    '.repeat(itemDepth);
		const bindings = (value.bindings ?? []).map(binding =>
			`${itemIndent}    <bind target="${escapeXML(binding.targetId)}" property="${escapeXML(binding.property)}" />`,
		);
		return propertyDefinition('parameter', name, value, itemDepth, bindings);
	});
	appendDefinitions(lines, 'parts', contract.parts, depth + 1, (name, value, itemDepth) => [
		`${'    '.repeat(itemDepth)}<part name="${escapeXML(name)}" node="${escapeXML(value.nodeId)}"${optionalBoolean('required', value.required)}${optionalString('description', value.description)} />`,
	]);
	appendDefinitions(lines, 'slots', contract.slots, depth + 1, (name, value, itemDepth) => [
		`${'    '.repeat(itemDepth)}<slot name="${escapeXML(name)}" node="${escapeXML(value.nodeId)}" capacity="${value.capacity}"${optionalBoolean('required', value.required)}${optionalString('description', value.description)} />`,
	]);
	appendOverrideDefinitions(lines, 'states', 'state', contract.states, depth + 1);
	appendOverrideDefinitions(lines, 'variants', 'variant', contract.variants, depth + 1);
	appendDefinitions(lines, 'dataFields', contract.dataFields ?? {}, depth + 1, (name, value, itemDepth) =>
		propertyDefinition('field', name, value, itemDepth),
	);
	appendDefinitions(lines, 'dataBindings', contract.dataBindings ?? {}, depth + 1, (name, value, itemDepth) => [
		`${'    '.repeat(itemDepth)}<binding name="${escapeXML(name)}" source="${escapeXML(value.source)}" target="${escapeXML(value.targetId)}" property="${escapeXML(value.property)}" />`,
	]);
	appendDefinitions(lines, 'actions', contract.actions ?? {}, depth + 1, (name, value, itemDepth) => [
		`${'    '.repeat(itemDepth)}<action name="${escapeXML(name)}" source="${escapeXML(value.sourceId)}" trigger="${value.trigger}"${optionalString('description', value.description)} />`,
	]);

	lines.push(`${indent}</contract>`);
	return lines;
}

function propertyDefinition(
	tag: string,
	name: string,
	definition: UIPropertyDefinition,
	depth: number,
	additionalChildren: readonly string[] = [],
): string[] {
	const indent = '    '.repeat(depth);
	const valueTypes = Array.isArray(definition.valueType) ? definition.valueType.join('|') : definition.valueType;
	const attributes = [
		`name="${escapeXML(name)}"`,
		`type="${valueTypes}"`,
		optionalString('format', definition.format),
		optionalList('resources', definition.resourceTypes),
		optionalList('tokens', definition.tokenTypes),
		optionalNumber('minimum', definition.minimum),
		optionalNumber('maximum', definition.maximum),
		optionalBoolean('integer', definition.integer),
		definition.defaultValue === undefined ? '' : ` default="${escapeXML(encodeXMLValue(definition.defaultValue) ?? '')}"`,
		optionalBoolean('required', definition.required),
		optionalString('description', definition.description),
	].filter(Boolean).map(part => part.trim()).join(' ');
	if ((!definition.enumValues || definition.enumValues.length === 0) && additionalChildren.length === 0) {
		return [`${indent}<${tag} ${attributes} />`];
	}
	const lines = [`${indent}<${tag} ${attributes}>`];
	for (const value of definition.enumValues ?? []) {
		lines.push(`${indent}    <enum value="${escapeXML(encodeXMLValue(value) ?? '')}" />`);
	}
	lines.push(...additionalChildren);
	lines.push(`${indent}</${tag}>`);
	return lines;
}

function appendOverrideDefinitions<T extends { readonly description?: string; readonly overrides: readonly UIPropertyOverride[] }>(
	lines: string[],
	container: string,
	tag: string,
	definitions: Readonly<Record<string, T>>,
	depth: number,
): void {
	appendDefinitions(lines, container, definitions, depth, (name, definition, itemDepth) => {
		const indent = '    '.repeat(itemDepth);
		const result = [`${indent}<${tag} name="${escapeXML(name)}"${optionalString('description', definition.description)}>`];
		for (const override of definition.overrides) {
			result.push(...serializeOverride(override, itemDepth + 1));
		}
		result.push(`${indent}</${tag}>`);
		return result;
	});
}

function serializeOverride(override: UIPropertyOverride, depth: number): string[] {
	const indent = '    '.repeat(depth);
	const transition = override.transition;
	const attributes = [
		`target="${escapeXML(override.targetId)}"`,
		`property="${escapeXML(override.property)}"`,
		transition === undefined ? '' : `duration="${transition.duration}"`,
		transition?.delay === undefined ? '' : `delay="${transition.delay}"`,
		transition?.easing === undefined ? '' : `easing="${transition.easing}"`,
	].filter(Boolean).join(' ');
	return serializeValue('set', attributes, override.value, depth, indent);
}

function serializeValue(tag: string, attributes: string, value: UIPropertyValue, depth: number, indent: string): string[] {
	const encoded = encodeXMLValue(value);
	if (encoded !== undefined) return [`${indent}<${tag} ${attributes} value="${escapeXML(encoded)}" />`];
	return [`${indent}<${tag} ${attributes}>`, ...serializeComplexValue(value, depth + 1), `${indent}</${tag}>`];
}

function appendDefinitions<T>(
	lines: string[],
	container: string,
	definitions: Readonly<Record<string, T>>,
	depth: number,
	serialize: (name: string, value: T, depth: number) => string[],
): void {
	const entries = Object.entries(definitions).sort(([left], [right]) => compareStrings(left, right));
	if (entries.length === 0) return;
	const indent = '    '.repeat(depth);
	lines.push(`${indent}<${container}>`);
	for (const [name, value] of entries) {
		lines.push(...serialize(name, value, depth + 1));
	}
	lines.push(`${indent}</${container}>`);
}

function optionalString(name: string, value: string | undefined): string {
	return value === undefined ? '' : ` ${name}="${escapeXML(value)}"`;
}

function optionalBoolean(name: string, value: boolean | undefined): string {
	return value === undefined ? '' : ` ${name}="${value}"`;
}

function optionalNumber(name: string, value: number | undefined): string {
	return value === undefined ? '' : ` ${name}="${value}"`;
}

function optionalList(name: string, value: readonly string[] | undefined): string {
	return value === undefined ? '' : ` ${name}="${escapeXML(value.join('|'))}"`;
}
