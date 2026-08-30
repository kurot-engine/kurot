import type { UIDiagnostic } from './UIDiagnostic.js';
import {
	addUIDiagnostic,
	isPlainRecord,
	validateKnownKeys,
	validateNonEmptyString,
	validatePropertyValue,
} from './validationHelpers.js';

const MODE_KEYS = new Set(['description', 'overrides']);
const OVERRIDE_KEYS = new Set(['property', 'targetId', 'transition', 'value']);
const TRANSITION_KEYS = new Set(['delay', 'duration', 'easing']);

/**
 * Validates a named collection of runtime-neutral states or variants.
 */
export function validateUIAssetModes(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
	nodeIds: ReadonlySet<string>,
	allowTransitions: boolean,
): void {
	if (!validateNamedModes(value, path, diagnostics)) return;
	for (const [name, definition] of Object.entries(value)) {
		const definitionPath = `${path}.${name}`;
		if (!isPlainRecord(definition)) {
			addUIDiagnostic(
				diagnostics,
				'invalid-asset-contract',
				definitionPath,
				'State or variant definition must be an object.',
			);
			continue;
		}
		validateKnownKeys(definition, MODE_KEYS, definitionPath, diagnostics);
		if (definition.description !== undefined) {
			validateNonEmptyString(
				definition.description,
				`${definitionPath}.description`,
				'Description',
				diagnostics,
			);
		}
		validateOverrides(
			definition.overrides,
			`${definitionPath}.overrides`,
			diagnostics,
			nodeIds,
			allowTransitions,
		);
	}
}

function validateOverrides(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
	nodeIds: ReadonlySet<string>,
	allowTransitions: boolean,
): void {
	if (!Array.isArray(value)) {
		addUIDiagnostic(
			diagnostics,
			'invalid-asset-contract',
			path,
			'State or variant overrides must be an array.',
		);
		return;
	}
	for (let index = 0; index < value.length; index++) {
		validatePropertyOverride(value[index], `${path}[${index}]`, diagnostics, nodeIds, allowTransitions);
	}
}

function validatePropertyOverride(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
	nodeIds: ReadonlySet<string>,
	allowTransitions: boolean,
): void {
	if (!isPlainRecord(value)) {
		addUIDiagnostic(
			diagnostics,
			'invalid-asset-contract',
			path,
			'Property override must be an object.',
		);
		return;
	}
	validateKnownKeys(value, OVERRIDE_KEYS, path, diagnostics);
	if (
		validateNonEmptyString(value.targetId, `${path}.targetId`, 'Target node id', diagnostics) &&
		!nodeIds.has(value.targetId)
	) {
		addUIDiagnostic(
			diagnostics,
			'unknown-node-reference',
			`${path}.targetId`,
			`Node "${value.targetId}" does not exist in this asset.`,
		);
	}
	validateNonEmptyString(value.property, `${path}.property`, 'Property name', diagnostics);
	validatePropertyValue(value.value, `${path}.value`, diagnostics);
	validateTransition(value.transition, `${path}.transition`, diagnostics, allowTransitions);
}

function validateTransition(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
	allowed: boolean,
): void {
	if (value === undefined) return;
	if (!allowed) {
		addUIDiagnostic(
			diagnostics,
			'invalid-asset-contract',
			path,
			'Transitions are supported only by state overrides.',
		);
		return;
	}
	if (!isPlainRecord(value)) {
		addUIDiagnostic(diagnostics, 'invalid-asset-contract', path, 'Property transition must be an object.');
		return;
	}
	validateKnownKeys(value, TRANSITION_KEYS, path, diagnostics);
	validateDuration(value.duration, `${path}.duration`, diagnostics);
	if (value.delay !== undefined) validateDuration(value.delay, `${path}.delay`, diagnostics);
	if (
		value.easing !== undefined &&
		value.easing !== 'linear' &&
		value.easing !== 'ease-in' &&
		value.easing !== 'ease-out' &&
		value.easing !== 'ease-in-out'
	) {
		addUIDiagnostic(
			diagnostics,
			'invalid-asset-contract',
			`${path}.easing`,
			'Transition easing is not supported.',
		);
	}
}

function validateDuration(value: unknown, path: string, diagnostics: UIDiagnostic[]): void {
	if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return;
	addUIDiagnostic(
		diagnostics,
		'invalid-asset-contract',
		path,
		'Transition time must be a non-negative finite number.',
	);
}

function validateNamedModes(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
): value is Record<string, unknown> {
	if (!isPlainRecord(value)) {
		addUIDiagnostic(
			diagnostics,
			'invalid-asset-contract',
			path,
			'Asset contract states and variants must be objects.',
		);
		return false;
	}
	for (const name of Object.keys(value)) {
		if (name.trim().length > 0) continue;
		addUIDiagnostic(
			diagnostics,
			'invalid-asset-contract',
			path,
			'State and variant names must not be empty.',
		);
	}
	return true;
}
