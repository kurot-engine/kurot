import type {
	UIPropertyObject,
	UIPropertyValue,
} from '../model/UIPropertyValue.js';
import {
	isUIAssetReference,
	isUIDesignTokenReference,
	isUIResourceReference,
} from '../model/UIReference.js';
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
	if (isUIResourceReference(value) && property.resourceTypes) {
		if (!property.resourceTypes.some(type => type === value.resourceType)) return false;
	}
	if (isUIDesignTokenReference(value) && property.tokenTypes) {
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
			return isUIAssetReference(value);
		case 'boolean':
			return typeof value === 'boolean';
		case 'number':
			return typeof value === 'number' && Number.isFinite(value);
		case 'object':
			return isStructuredObject(value);
		case 'resource-reference':
			return isUIResourceReference(value);
		case 'string':
			return typeof value === 'string';
		case 'token-reference':
			return isUIDesignTokenReference(value);
		case 'value':
			return typeof value !== 'number' || Number.isFinite(value);
		default:
			return false;
	}
}

function isStructuredObject(value: UIPropertyValue): value is UIPropertyObject {
	if (!isPropertyObject(value)) return false;
	return value.kind !== 'asset' && value.kind !== 'resource' && value.kind !== 'token';
}

function isPropertyObject(value: UIPropertyValue): value is UIPropertyObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
