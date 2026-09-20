import type {
	UIAssetContract,
	UIDataBindingDefinition,
	UIParameterDefinition,
	UIPartDefinition,
	UIPropertyOverride,
	UISemanticActionDefinition,
	UISlotDefinition,
	UIStateDefinition,
	UITransitionEasing,
	UIVariantDefinition,
} from '../../model/UIAssetContract.js';
import type { UIPropertyPrimitive, UIPropertyValue } from '../../model/UIPropertyValue.js';
import type {
	UIPropertyDefinition,
	UIPropertyFormat,
	UIPropertyValueType,
} from '../../schema/UIComponentDefinition.js';
import type { XMLElement } from './xml-parser.js';
import { decodeXMLValue, parseComplexValue } from './xml-values.js';

/**
 * Parses the public contract of one UI asset.
 */
export function parseContract(element: XMLElement | undefined): UIAssetContract {
	if (element === undefined) return emptyContract();
	if (element.name !== 'contract') throw new Error(`Expected <contract>, received <${element.name}>.`);

	const parameters: Record<string, UIParameterDefinition> = {};
	const parts: Record<string, UIPartDefinition> = {};
	const slots: Record<string, UISlotDefinition> = {};
	const states: Record<string, UIStateDefinition> = {};
	const variants: Record<string, UIVariantDefinition> = {};
	const dataFields: Record<string, UIPropertyDefinition> = {};
	const dataBindings: Record<string, UIDataBindingDefinition> = {};
	const actions: Record<string, UISemanticActionDefinition> = {};

	for (const container of element.children) {
		switch (container.name) {
			case 'parameters': parseParameters(container, parameters); break;
			case 'parts': parseParts(container, parts); break;
			case 'slots': parseSlots(container, slots); break;
			case 'states': parseOverrides(container, 'state', states); break;
			case 'variants': parseOverrides(container, 'variant', variants); break;
			case 'dataFields': parsePropertyDefinitions(container, 'field', dataFields); break;
			case 'dataBindings': parseDataBindings(container, dataBindings); break;
			case 'actions': parseActions(container, actions); break;
			default: throw new Error(`Unexpected <${container.name}> inside <contract>.`);
		}
	}

	return {
		...(element.attributes.componentType === undefined ? {} : { componentType: element.attributes.componentType }),
		...(element.attributes.targetType === undefined ? {} : { targetType: element.attributes.targetType }),
		parameters,
		parts,
		slots,
		states,
		variants,
		dataFields,
		dataBindings,
		actions,
	};
}

function parseParameters(container: XMLElement, target: Record<string, UIParameterDefinition>): void {
	for (const element of childrenNamed(container, 'parameter')) {
		const bindings = element.children
			.filter(child => child.name === 'bind')
			.map(binding => ({
				targetId: requiredAttribute(binding, 'target'),
				property: requiredAttribute(binding, 'property'),
			}));
		const definition = parsePropertyDefinition(element);
		target[requiredAttribute(element, 'name')] = {
			...definition,
			...(bindings.length === 0 ? {} : { bindings }),
		};
	}
}

function parseParts(container: XMLElement, target: Record<string, UIPartDefinition>): void {
	for (const element of childrenNamed(container, 'part')) {
		target[requiredAttribute(element, 'name')] = {
			nodeId: requiredAttribute(element, 'node'),
			...optionalBoolean(element, 'required'),
			...optionalString(element, 'description'),
		};
	}
}

function parseSlots(container: XMLElement, target: Record<string, UISlotDefinition>): void {
	for (const element of childrenNamed(container, 'slot')) {
		const capacity = requiredAttribute(element, 'capacity');
		target[requiredAttribute(element, 'name')] = {
			nodeId: requiredAttribute(element, 'node'),
			capacity: capacity as UISlotDefinition['capacity'],
			...optionalBoolean(element, 'required'),
			...optionalString(element, 'description'),
		};
	}
}

function parseOverrides(
	container: XMLElement,
	tag: string,
	target: Record<string, UIStateDefinition | UIVariantDefinition>,
): void {
	for (const element of childrenNamed(container, tag)) {
		const overrides = element.children.map(parseOverride);
		target[requiredAttribute(element, 'name')] = {
			overrides,
			...optionalString(element, 'description'),
		};
	}
}

function parseOverride(element: XMLElement): UIPropertyOverride {
	if (element.name !== 'set') throw new Error(`Expected <set>, received <${element.name}>.`);
	const duration = element.attributes.duration;
	return {
		targetId: requiredAttribute(element, 'target'),
		property: requiredAttribute(element, 'property'),
		value: parseElementValue(element),
		...(duration === undefined
			? {}
			: {
					transition: {
						duration: Number(duration),
						...(element.attributes.delay === undefined ? {} : { delay: Number(element.attributes.delay) }),
						...(element.attributes.easing === undefined
							? {}
							: { easing: element.attributes.easing as UITransitionEasing }),
					},
				}),
	};
}

function parsePropertyDefinitions(
	container: XMLElement,
	tag: string,
	target: Record<string, UIPropertyDefinition>,
): void {
	for (const element of childrenNamed(container, tag)) {
		target[requiredAttribute(element, 'name')] = parsePropertyDefinition(element);
	}
}

function parsePropertyDefinition(element: XMLElement): UIPropertyDefinition {
	const types = requiredAttribute(element, 'type').split('|') as UIPropertyValueType[];
	const enumValues = element.children
		.filter(child => child.name === 'enum')
		.map(child => decodeXMLValue(requiredAttribute(child, 'value')) as UIPropertyPrimitive);
	return {
		valueType: types.length === 1 ? types[0] ?? 'value' : types,
		...(element.attributes.format === undefined ? {} : { format: element.attributes.format as UIPropertyFormat }),
		...(element.attributes.resources === undefined ? {} : { resourceTypes: element.attributes.resources.split('|') as NonNullable<UIPropertyDefinition['resourceTypes']> }),
		...(element.attributes.tokens === undefined ? {} : { tokenTypes: element.attributes.tokens.split('|') as NonNullable<UIPropertyDefinition['tokenTypes']> }),
		...(enumValues.length === 0 ? {} : { enumValues }),
		...optionalNumber(element, 'minimum'),
		...optionalNumber(element, 'maximum'),
		...optionalBoolean(element, 'integer'),
		...(element.attributes.default === undefined ? {} : { defaultValue: decodeXMLValue(element.attributes.default) as UIPropertyPrimitive }),
		...optionalBoolean(element, 'required'),
		...optionalString(element, 'description'),
	};
}

function parseDataBindings(container: XMLElement, target: Record<string, UIDataBindingDefinition>): void {
	for (const element of childrenNamed(container, 'binding')) {
		target[requiredAttribute(element, 'name')] = {
			source: requiredAttribute(element, 'source'),
			targetId: requiredAttribute(element, 'target'),
			property: requiredAttribute(element, 'property'),
		};
	}
}

function parseActions(container: XMLElement, target: Record<string, UISemanticActionDefinition>): void {
	for (const element of childrenNamed(container, 'action')) {
		target[requiredAttribute(element, 'name')] = {
			sourceId: requiredAttribute(element, 'source'),
			trigger: requiredAttribute(element, 'trigger') as UISemanticActionDefinition['trigger'],
			...optionalString(element, 'description'),
		};
	}
}

function parseElementValue(element: XMLElement): UIPropertyValue {
	if (element.attributes.value !== undefined) return decodeXMLValue(element.attributes.value);
	if (element.children.length !== 1 || element.children[0] === undefined) {
		throw new Error(`<${element.name}> requires a value attribute or one complex value.`);
	}
	return parseComplexValue(element.children[0]);
}

function childrenNamed(element: XMLElement, name: string): readonly XMLElement[] {
	for (const child of element.children) {
		if (child.name !== name) throw new Error(`Unexpected <${child.name}> inside <${element.name}>.`);
	}
	return element.children;
}

function requiredAttribute(element: XMLElement, name: string): string {
	const value = element.attributes[name];
	if (value === undefined || value.length === 0) throw new Error(`<${element.name}> requires ${name}.`);
	return value;
}

function optionalString(element: XMLElement, name: string): { [key: string]: string } {
	return element.attributes[name] === undefined ? {} : { [name]: element.attributes[name] };
}

function optionalBoolean(element: XMLElement, name: string): { [key: string]: boolean } {
	return element.attributes[name] === undefined ? {} : { [name]: element.attributes[name] === 'true' };
}

function optionalNumber(element: XMLElement, name: string): { [key: string]: number } {
	return element.attributes[name] === undefined ? {} : { [name]: Number(element.attributes[name]) };
}

function emptyContract(): UIAssetContract {
	return { parameters: {}, parts: {}, slots: {}, states: {}, variants: {}, dataFields: {}, dataBindings: {}, actions: {} };
}
