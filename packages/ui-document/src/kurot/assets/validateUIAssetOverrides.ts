import { findUINode } from '../document/query.js';
import type {
	UIDataBindingDefinition,
	UIPropertyOverride,
} from '../model/UIAssetContract.js';
import type { UIDocument } from '../model/UIDocument.js';
import type { UIComponentRegistry } from '../schema/UIComponentRegistry.js';
import type {
	UIPropertyDefinition,
	UIPropertyValueType,
} from '../schema/UIComponentDefinition.js';
import { matchesUIPropertyDefinition } from '../schema/matchesUIPropertyDefinition.js';
import type { UIDiagnostic } from '../validation/UIDiagnostic.js';
import { addUIDiagnostic } from '../validation/validationHelpers.js';

/**
 * Validates state and variant override properties against component schemas.
 */
export function validateUIAssetOverrides(
	document: UIDocument,
	components: UIComponentRegistry,
): UIDiagnostic[] {
	const diagnostics: UIDiagnostic[] = [];
	validateParameterBindings(document, components, diagnostics);
	validateDataBindings(document, components, diagnostics);
	validateModes(document, 'states', components, diagnostics);
	validateModes(document, 'variants', components, diagnostics);
	return diagnostics;
}

function validateDataBindings(
	document: UIDocument,
	components: UIComponentRegistry,
	diagnostics: UIDiagnostic[],
): void {
	const bindings = document.contract.dataBindings ?? {};
	for (const [name, binding] of Object.entries(bindings)) {
		validateDataBinding(document, binding, name, components, diagnostics);
	}
}

function validateDataBinding(
	document: UIDocument,
	binding: UIDataBindingDefinition,
	name: string,
	components: UIComponentRegistry,
	diagnostics: UIDiagnostic[],
): void {
	const target = findUINode(document.root, binding.targetId);
	if (!target) return;
	const component = components.resolve(target.type);
	if (!component) return;
	const targetProperty = component.properties[binding.property];
	const path = `$.contract.dataBindings.${name}`;
	if (!targetProperty) {
		addUIDiagnostic(
			diagnostics,
			'unknown-component-property',
			`${path}.property`,
			`Property "${binding.property}" is not defined for ${target.type}.`,
		);
		return;
	}
	const sourceProperty = document.contract.dataFields?.[binding.source];
	if (!sourceProperty || propertyTypesOverlap(sourceProperty, targetProperty)) return;
	addUIDiagnostic(
		diagnostics,
		'invalid-component-property',
		`${path}.source`,
		`Data field "${binding.source}" is not compatible with ${target.type}.${binding.property}.`,
	);
}

function propertyTypesOverlap(
	source: UIPropertyDefinition,
	target: UIPropertyDefinition,
): boolean {
	const sourceTypes = new Set(toValueTypes(source.valueType));
	return toValueTypes(target.valueType).some(type => sourceTypes.has(type));
}

function toValueTypes(
	value: UIPropertyDefinition['valueType'],
): readonly UIPropertyValueType[] {
	return Array.isArray(value) ? value : [value as UIPropertyValueType];
}

function validateParameterBindings(
	document: UIDocument,
	components: UIComponentRegistry,
	diagnostics: UIDiagnostic[],
): void {
	for (const [name, parameter] of Object.entries(document.contract.parameters)) {
		const bindings = parameter.bindings ?? [];
		for (let index = 0; index < bindings.length; index++) {
			const binding = bindings[index]!;
			const target = findUINode(document.root, binding.targetId);
			if (!target) continue;
			const definition = components.resolve(target.type);
			if (!definition || definition.properties[binding.property]) continue;
			addUIDiagnostic(
				diagnostics,
				'unknown-component-property',
				`$.contract.parameters.${name}.bindings[${index}].property`,
				`Property "${binding.property}" is not defined for ${target.type}.`,
			);
		}
	}
}

/**
 * Validates one override against the schema of its concrete target node.
 */
function validateUIPropertyOverride(
	document: UIDocument,
	override: UIPropertyOverride,
	path: string,
	components: UIComponentRegistry,
	diagnostics: UIDiagnostic[],
): void {
	const target = findUINode(document.root, override.targetId);
	if (!target) return;
	const definition = components.resolve(target.type);
	if (!definition) return;
	const property = definition.properties[override.property];
	if (!property) {
		addUIDiagnostic(
			diagnostics,
			'unknown-component-property',
			`${path}.property`,
			`Property "${override.property}" is not defined for ${target.type}.`,
		);
		return;
	}
	if (override.transition && !supportsNumericTransition(property)) {
		addUIDiagnostic(
			diagnostics,
			'invalid-component-property',
			`${path}.transition`,
			`Transition target "${override.property}" must accept numeric values.`,
		);
	}
	if (matchesUIPropertyDefinition(override.value, property)) return;
	addUIDiagnostic(
		diagnostics,
		'invalid-component-property',
		`${path}.value`,
		`Override for "${override.property}" does not satisfy the schema of ${target.type}.`,
	);
}

function supportsNumericTransition(property: UIPropertyDefinition): boolean {
	return toValueTypes(property.valueType).includes('number');
}

function validateModes(
	document: UIDocument,
	key: 'states' | 'variants',
	components: UIComponentRegistry,
	diagnostics: UIDiagnostic[],
): void {
	for (const [name, mode] of Object.entries(document.contract[key])) {
		for (let index = 0; index < mode.overrides.length; index++) {
			validateUIPropertyOverride(
				document,
				mode.overrides[index]!,
				`$.contract.${key}.${name}.overrides[${index}]`,
				components,
				diagnostics,
			);
		}
	}
}
