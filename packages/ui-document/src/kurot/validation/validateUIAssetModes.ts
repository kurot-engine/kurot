import type { UIDiagnostic } from './UIDiagnostic.js';
import {
	addUIDiagnostic,
	isPlainRecord,
	validateKnownKeys,
	validateNonEmptyString,
	validatePropertyValue,
} from './validationHelpers.js';

const MODE_KEYS = new Set(['description', 'overrides']);
const OVERRIDE_KEYS = new Set(['property', 'targetId', 'value']);

/**
 * Validates a named collection of runtime-neutral states or variants.
 */
export function validateUIAssetModes(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
	nodeIds: ReadonlySet<string>,
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
		);
	}
}

function validateOverrides(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
	nodeIds: ReadonlySet<string>,
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
		validatePropertyOverride(value[index], `${path}[${index}]`, diagnostics, nodeIds);
	}
}

function validatePropertyOverride(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
	nodeIds: ReadonlySet<string>,
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
