import { findUINode } from '../document/query.js';
import type {
	UIDataBindingDefinition,
	UIPropertyOverride,
} from '../model/UIAssetContract.js';
import type { UIDocument } from '../model/UIDocument.js';
import { isUIDesignTokenReference } from '../model/UIReference.js';
import type { UIComponentRegistry } from '../schema/UIComponentRegistry.js';
import type {
	UIPropertyDefinition,
	UIPropertyValueType,
} from '../schema/UIComponentDefinition.js';
import { isUIPropertyDefinitionAssignable } from '../schema/isUIPropertyDefinitionAssignable.js';
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
	validateActions(document, components, diagnostics);
	validateAppearanceContract(document, components, diagnostics);
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
	if (!sourceProperty || isUIPropertyDefinitionAssignable(sourceProperty, targetProperty)) {
		return;
	}
	addUIDiagnostic(
		diagnostics,
		'invalid-component-property',
		`${path}.source`,
		`Data field "${binding.source}" is not compatible with ${target.type}.${binding.property}.`,
	);
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
			if (!target) {
				continue;
			}
			const definition = components.resolve(target.type);
			if (!definition) {
				continue;
			}
			const targetProperty = definition.properties[binding.property];
			if (!targetProperty) {
				addUIDiagnostic(
					diagnostics,
					'unknown-component-property',
					`$.contract.parameters.${name}.bindings[${index}].property`,
					`Property "${binding.property}" is not defined for ${target.type}.`,
				);
				continue;
			}
			if (isUIPropertyDefinitionAssignable(parameter, targetProperty)) {
				continue;
			}
			addUIDiagnostic(
				diagnostics,
				'invalid-component-property',
				`$.contract.parameters.${name}.bindings[${index}]`,
				`Parameter "${name}" is not compatible with ${target.type}.${binding.property}.`,
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
	if (
		override.transition &&
		(!supportsNumericTransition(property) || !isNumericTransitionValue(override.value))
	) {
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

function isNumericTransitionValue(
	value: UIPropertyOverride['value'],
): boolean {
	if (typeof value === 'number') {
		return true;
	}
	return (
		isUIDesignTokenReference(value) &&
		(value.tokenType === 'color' ||
			value.tokenType === 'number' ||
			value.tokenType === 'spacing')
	);
}

function validateActions(
	document: UIDocument,
	components: UIComponentRegistry,
	diagnostics: UIDiagnostic[],
): void {
	for (const [name, action] of Object.entries(document.contract.actions ?? {})) {
		const source = findUINode(document.root, action.sourceId);
		if (!source) {
			continue;
		}
		const definition = components.resolve(source.type);
		if (!definition || definition.events.includes(action.trigger)) {
			continue;
		}
		addUIDiagnostic(
			diagnostics,
			'invalid-asset-contract',
			`$.contract.actions.${name}.trigger`,
			`${source.type} does not emit the "${action.trigger}" semantic event.`,
		);
	}
}

function validateAppearanceContract(
	document: UIDocument,
	components: UIComponentRegistry,
	diagnostics: UIDiagnostic[],
): void {
	if (document.assetKind !== 'appearance' || !document.contract.targetType) {
		return;
	}
	const target = components.resolve(document.contract.targetType);
	if (!target || !target.appearance) {
		addUIDiagnostic(
			diagnostics,
			'invalid-component-source',
			'$.contract.targetType',
			`${document.contract.targetType} does not support appearance assets.`,
		);
		return;
	}
	for (const state of Object.keys(document.contract.states)) {
		if (target.appearance.states?.includes(state)) {
			continue;
		}
		addUIDiagnostic(
			diagnostics,
			'invalid-asset-contract',
			`$.contract.states.${state}`,
			`State "${state}" is not supported by ${document.contract.targetType}.`,
		);
	}
	for (const [name, part] of Object.entries(target.appearance.parts ?? {})) {
		const authoredPart = document.contract.parts[name];
		if (!authoredPart) {
			if (part.required) {
				addUIDiagnostic(
					diagnostics,
					'invalid-asset-contract',
					`$.contract.parts.${name}`,
					`Appearance for ${document.contract.targetType} requires part "${name}".`,
				);
			}
			continue;
		}
		if (!part.type) {
			continue;
		}
		const node = findUINode(document.root, authoredPart.nodeId);
		if (!node) {
			continue;
		}
		const nodeType = components.resolve(node.type);
		if (nodeType && (nodeType.type === part.type || nodeType.baseTypes.includes(part.type))) {
			continue;
		}
		addUIDiagnostic(
			diagnostics,
			'invalid-component-source',
			`$.contract.parts.${name}.nodeId`,
			`Part "${name}" must use ${part.type} or one of its derived types.`,
		);
	}
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
