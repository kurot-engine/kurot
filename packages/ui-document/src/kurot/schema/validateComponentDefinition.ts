import type {
	UIChildrenPolicy,
	UIComponentDefinition,
	UIPropertyDefinition,
	UIPropertyFormat,
	UIPropertyValueType,
} from './UIComponentDefinition.js';

const CHILDREN_POLICIES = new Set<UIChildrenPolicy>(['multiple', 'none', 'single']);
const PROPERTY_VALUE_TYPES = new Set<UIPropertyValueType>([
	'array',
	'boolean',
	'number',
	'object',
	'string',
	'value',
]);
const PROPERTY_FORMATS = new Set<UIPropertyFormat>([
	'color',
	'layout',
	'rectangle',
	'resource',
	'skin',
]);

/**
 * Rejects malformed component metadata before it enters a registry.
 */
export function validateComponentDefinition(definition: UIComponentDefinition): void {
	assertNonEmpty(definition.type, 'Component type');
	if (definition.extends !== undefined) {
		assertNonEmpty(definition.extends, 'Base component type');
	}
	if (definition.abstract !== undefined && typeof definition.abstract !== 'boolean') {
		throw new Error('Component abstract flag must be a boolean.');
	}
	if (definition.displayName !== undefined) {
		assertNonEmpty(definition.displayName, 'Component display name');
	}
	if (definition.description !== undefined) {
		assertNonEmpty(definition.description, 'Component description');
	}
	if (definition.children !== undefined && !CHILDREN_POLICIES.has(definition.children)) {
		throw new Error(`Unsupported child policy "${String(definition.children)}".`);
	}
	if (
		definition.allowUnknownProperties !== undefined &&
		typeof definition.allowUnknownProperties !== 'boolean'
	) {
		throw new Error('allowUnknownProperties must be a boolean.');
	}

	for (const [name, property] of Object.entries(definition.properties ?? {})) {
		assertNonEmpty(name, 'Component property name');
		validatePropertyDefinition(name, property);
	}
}

function validatePropertyDefinition(name: string, definition: UIPropertyDefinition): void {
	const valueTypes = Array.isArray(definition.valueType)
		? definition.valueType
		: [definition.valueType];
	if (valueTypes.length === 0) {
		throw new Error(`Property "${name}" must accept at least one value type.`);
	}
	const uniqueValueTypes = new Set<UIPropertyValueType>();
	for (const valueType of valueTypes) {
		if (!PROPERTY_VALUE_TYPES.has(valueType)) {
			throw new Error(
				`Unsupported value type "${String(valueType)}" for property "${name}".`,
			);
		}
		if (uniqueValueTypes.has(valueType)) {
			throw new Error(`Property "${name}" contains duplicate value type "${valueType}".`);
		}
		uniqueValueTypes.add(valueType);
	}
	if (definition.format !== undefined && !PROPERTY_FORMATS.has(definition.format)) {
		throw new Error(`Unsupported format "${String(definition.format)}" for property "${name}".`);
	}
	if (definition.required !== undefined && typeof definition.required !== 'boolean') {
		throw new Error(`Property "${name}" required flag must be a boolean.`);
	}
	if (definition.description !== undefined) {
		assertNonEmpty(definition.description, `Property "${name}" description`);
	}
	if (definition.integer !== undefined && typeof definition.integer !== 'boolean') {
		throw new Error(`Property "${name}" integer flag must be a boolean.`);
	}
	if (
		definition.integer &&
		!uniqueValueTypes.has('number') &&
		!uniqueValueTypes.has('value')
	) {
		throw new Error(`Property "${name}" integer flag requires a numeric value type.`);
	}
	validateNumericConstraint(name, 'minimum', definition.minimum, uniqueValueTypes);
	validateNumericConstraint(name, 'maximum', definition.maximum, uniqueValueTypes);
	if (
		definition.minimum !== undefined &&
		definition.maximum !== undefined &&
		definition.minimum > definition.maximum
	) {
		throw new Error(`Property "${name}" minimum cannot exceed its maximum.`);
	}
	validateEnumValues(name, definition, uniqueValueTypes);
	if (
		definition.defaultValue !== undefined &&
		!matchesPropertyConstraints(definition.defaultValue, definition, uniqueValueTypes)
	) {
		throw new Error(`Property "${name}" default value does not satisfy its schema.`);
	}
}

function validateEnumValues(
	name: string,
	definition: UIPropertyDefinition,
	valueTypes: ReadonlySet<UIPropertyValueType>,
): void {
	const enumValues = definition.enumValues;
	if (enumValues === undefined) return;
	if (!Array.isArray(enumValues) || enumValues.length === 0) {
		throw new Error(`Property "${name}" enumValues must be a non-empty array.`);
	}
	for (const value of enumValues) {
		if (!matchesPrimitiveType(value, valueTypes)) {
			throw new Error(`Property "${name}" has an enum value outside its accepted types.`);
		}
	}
	for (let index = 0; index < enumValues.length; index++) {
		if (enumValues.slice(0, index).some(value => Object.is(value, enumValues[index]))) {
			throw new Error(`Property "${name}" contains duplicate enum values.`);
		}
	}
}

function validateNumericConstraint(
	name: string,
	label: 'maximum' | 'minimum',
	value: number | undefined,
	valueTypes: ReadonlySet<UIPropertyValueType>,
): void {
	if (value === undefined) return;
	if (!Number.isFinite(value)) {
		throw new Error(`Property "${name}" ${label} must be a finite number.`);
	}
	if (!valueTypes.has('number') && !valueTypes.has('value')) {
		throw new Error(`Property "${name}" ${label} requires a numeric value type.`);
	}
}

function matchesPropertyConstraints(
	value: boolean | number | string,
	definition: UIPropertyDefinition,
	valueTypes: ReadonlySet<UIPropertyValueType>,
): boolean {
	if (!matchesPrimitiveType(value, valueTypes)) return false;
	if (definition.enumValues && !definition.enumValues.some(item => Object.is(item, value))) {
		return false;
	}
	if (typeof value !== 'number') return true;
	if (definition.minimum !== undefined && value < definition.minimum) return false;
	if (definition.maximum !== undefined && value > definition.maximum) return false;
	return !definition.integer || Number.isInteger(value);
}

function matchesPrimitiveType(
	value: boolean | number | string,
	valueTypes: ReadonlySet<UIPropertyValueType>,
): boolean {
	if (typeof value === 'number' && !Number.isFinite(value)) return false;
	return valueTypes.has('value') || valueTypes.has(typeof value as UIPropertyValueType);
}

function assertNonEmpty(value: string, label: string): void {
	if (typeof value !== 'string' || value.trim().length === 0) {
		throw new Error(`${label} must be a non-empty string.`);
	}
}
