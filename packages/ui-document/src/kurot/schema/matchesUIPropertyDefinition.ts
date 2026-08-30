import type {
	UIPropertyObject,
	UIPropertyValue,
} from '../model/UIPropertyValue.js';
import type {
	UIPropertyDefinition,
	UIPropertyValueType,
} from './UIComponentDefinition.js';

/**
 * Reports whether a serializable value satisfies one semantic property definition.
 */
export function matchesUIPropertyDefinition(
	value: UIPropertyValue,
	property: UIPropertyDefinition,
): boolean {
	const valueTypes = Array.isArray(property.valueType)
		? property.valueType
		: [property.valueType];
	if (!valueTypes.some(valueType => matchesValueType(value, valueType))) return false;
	if (isTaggedReference(value, 'resource') && property.resourceTypes) {
		if (!('resourceType' in value)) return false;
		if (!property.resourceTypes.some(type => type === value.resourceType)) return false;
	}
	if (isTaggedReference(value, 'token') && property.tokenTypes) {
		if (!('tokenType' in value)) return false;
		if (!property.tokenTypes.some(type => type === value.tokenType)) return false;
	}
	if (property.enumValues && !property.enumValues.some(item => Object.is(item, value))) {
		return false;
	}
	if (typeof value === 'number') {
		if (property.minimum !== undefined && value < property.minimum) return false;
		if (property.maximum !== undefined && value > property.maximum) return false;
		if (property.integer && !Number.isInteger(value)) return false;
	}
	return true;
}

function matchesValueType(
	value: UIPropertyValue,
	valueType: UIPropertyValueType,
): boolean {
	switch (valueType) {
		case 'array':
			return Array.isArray(value);
		case 'asset-reference':
			return isTaggedReference(value, 'asset');
		case 'boolean':
			return typeof value === 'boolean';
		case 'number':
			return typeof value === 'number';
		case 'object':
			return typeof value === 'object' && !Array.isArray(value);
		case 'resource-reference':
			return isTaggedReference(value, 'resource');
		case 'string':
			return typeof value === 'string';
		case 'token-reference':
			return isTaggedReference(value, 'token');
		case 'value':
			return true;
		default:
			return false;
	}
}

function isTaggedReference(
	value: UIPropertyValue,
	kind: 'asset' | 'resource' | 'token',
): value is UIPropertyObject {
	return (
		typeof value === 'object' &&
		!Array.isArray(value) &&
		'kind' in value &&
		value.kind === kind
	);
}
