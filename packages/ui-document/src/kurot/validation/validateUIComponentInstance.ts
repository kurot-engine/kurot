import type { UIDiagnostic } from './UIDiagnostic.js';
import {
	addUIDiagnostic,
	isPlainRecord,
	validateAssetReference,
	validateKnownKeys,
	validateNonEmptyString,
	validatePropertyValue,
} from './validationHelpers.js';

const INSTANCE_KEYS = new Set([
	'overrides',
	'parameters',
	'slots',
	'source',
	'variant',
]);
const OVERRIDE_KEYS = new Set(['part', 'property', 'value']);

/**
 * Validates one reusable component instance and visits its projected children.
 */
export function validateUIComponentInstance(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
	validateNode: (value: unknown, path: string) => void,
): void {
	if (!isPlainRecord(value)) {
		addUIDiagnostic(
			diagnostics,
			'invalid-component-instance',
			path,
			'Component instance must be an object.',
		);
		return;
	}

	validateKnownKeys(value, INSTANCE_KEYS, path, diagnostics);
	validateAssetReference(value.source, `${path}.source`, diagnostics);
	validateParameters(value.parameters, `${path}.parameters`, diagnostics);
	if (value.variant !== undefined) {
		validateNonEmptyString(value.variant, `${path}.variant`, 'Variant', diagnostics);
	}
	validateOverrides(value.overrides, `${path}.overrides`, diagnostics);
	validateSlots(value.slots, `${path}.slots`, diagnostics, validateNode);
}

function validateParameters(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
): void {
	if (!isPlainRecord(value)) {
		addUIDiagnostic(
			diagnostics,
			'invalid-component-instance',
			path,
			'Instance parameters must be an object.',
		);
		return;
	}
	for (const [name, parameter] of Object.entries(value)) {
		if (name.trim().length === 0) {
			addUIDiagnostic(
				diagnostics,
				'invalid-component-instance',
				path,
				'Instance parameter names must not be empty.',
			);
			continue;
		}
		validatePropertyValue(parameter, `${path}.${name}`, diagnostics);
	}
}

function validateOverrides(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
): void {
	if (!Array.isArray(value)) {
		addUIDiagnostic(
			diagnostics,
			'invalid-component-instance',
			path,
			'Instance overrides must be an array.',
		);
		return;
	}
	for (let index = 0; index < value.length; index++) {
		const overridePath = `${path}[${index}]`;
		const override = value[index];
		if (!isPlainRecord(override)) {
			addUIDiagnostic(
				diagnostics,
				'invalid-component-instance',
				overridePath,
				'Instance override must be an object.',
			);
			continue;
		}
		validateKnownKeys(override, OVERRIDE_KEYS, overridePath, diagnostics);
		validateNonEmptyString(override.part, `${overridePath}.part`, 'Part name', diagnostics);
		validateNonEmptyString(
			override.property,
			`${overridePath}.property`,
			'Property name',
			diagnostics,
		);
		validatePropertyValue(override.value, `${overridePath}.value`, diagnostics);
	}
}

function validateSlots(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
	validateNode: (value: unknown, path: string) => void,
): void {
	if (!isPlainRecord(value)) {
		addUIDiagnostic(
			diagnostics,
			'invalid-component-instance',
			path,
			'Instance slots must be an object.',
		);
		return;
	}
	for (const [name, children] of Object.entries(value)) {
		const slotPath = `${path}.${name}`;
		if (name.trim().length === 0) {
			addUIDiagnostic(
				diagnostics,
				'invalid-component-instance',
				path,
				'Instance slot names must not be empty.',
			);
		}
		if (!Array.isArray(children)) {
			addUIDiagnostic(
				diagnostics,
				'invalid-component-instance',
				slotPath,
				'Instance slot content must be an array.',
			);
			continue;
		}
		for (let index = 0; index < children.length; index++) {
			validateNode(children[index], `${slotPath}[${index}]`);
		}
	}
}
