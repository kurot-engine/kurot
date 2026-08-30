import type { UIAssetKind } from '../model/UIAssetKind.js';
import type { UIPropertyDefinition } from '../schema/UIComponentDefinition.js';
import { validateComponentDefinition } from '../schema/validateComponentDefinition.js';
import type { UIDiagnostic } from './UIDiagnostic.js';
import {
	addUIDiagnostic,
	isPlainRecord,
	validateKnownKeys,
	validateNonEmptyString,
} from './validationHelpers.js';
import { validateUIAssetModes } from './validateUIAssetModes.js';

const CONTRACT_KEYS = new Set([
	'componentType',
	'parameters',
	'parts',
	'slots',
	'states',
	'targetType',
	'variants',
]);
const PARAMETER_KEYS = new Set([
	'defaultValue',
	'description',
	'enumValues',
	'format',
	'integer',
	'maximum',
	'minimum',
	'required',
	'resourceTypes',
	'tokenTypes',
	'valueType',
]);
const PART_KEYS = new Set(['description', 'nodeId', 'required']);
const SLOT_KEYS = new Set(['capacity', 'description', 'nodeId', 'required']);

/**
 * Validates the public authoring contract of one UI asset.
 */
export function validateUIAssetContract(
	value: unknown,
	assetKind: UIAssetKind | undefined,
	path: string,
	diagnostics: UIDiagnostic[],
	nodeIds: ReadonlySet<string>,
): void {
	if (!isPlainRecord(value)) {
		addUIDiagnostic(
			diagnostics,
			'invalid-asset-contract',
			path,
			'Asset contract must be an object.',
		);
		return;
	}

	validateKnownKeys(value, CONTRACT_KEYS, path, diagnostics);
	validateContractTypes(value, assetKind, path, diagnostics);
	validateParameters(value.parameters, `${path}.parameters`, diagnostics);
	validateParts(value.parts, `${path}.parts`, diagnostics, nodeIds);
	validateSlots(value.slots, `${path}.slots`, diagnostics, nodeIds);
	validateUIAssetModes(value.states, `${path}.states`, diagnostics, nodeIds);
	validateUIAssetModes(value.variants, `${path}.variants`, diagnostics, nodeIds);
}

function validateContractTypes(
	value: Record<string, unknown>,
	assetKind: UIAssetKind | undefined,
	path: string,
	diagnostics: UIDiagnostic[],
): void {
	if (assetKind === 'component') {
		validateNonEmptyString(
			value.componentType,
			`${path}.componentType`,
			'Component type',
			diagnostics,
		);
	} else if (value.componentType !== undefined) {
		addUIDiagnostic(
			diagnostics,
			'invalid-asset-contract',
			`${path}.componentType`,
			'Only component assets may publish a component type.',
		);
	}

	if (assetKind === 'appearance') {
		validateNonEmptyString(
			value.targetType,
			`${path}.targetType`,
			'Appearance target type',
			diagnostics,
		);
	} else if (value.targetType !== undefined) {
		addUIDiagnostic(
			diagnostics,
			'invalid-asset-contract',
			`${path}.targetType`,
			'Only appearance assets may declare a target type.',
		);
	}
}

function validateParameters(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
): void {
	if (!validateNamedRecord(value, path, 'parameters', diagnostics)) return;
	for (const [name, definition] of Object.entries(value)) {
		const definitionPath = `${path}.${name}`;
		if (!isPlainRecord(definition)) {
			addUIDiagnostic(
				diagnostics,
				'invalid-asset-contract',
				definitionPath,
				'Parameter definition must be an object.',
			);
			continue;
		}
		validateKnownKeys(definition, PARAMETER_KEYS, definitionPath, diagnostics);
		try {
			validateComponentDefinition({
				type: 'kurot.ContractParameter',
				properties: { [name]: definition as unknown as UIPropertyDefinition },
			});
		} catch (error) {
			addUIDiagnostic(
				diagnostics,
				'invalid-asset-contract',
				definitionPath,
				error instanceof Error ? error.message : 'Invalid parameter definition.',
			);
		}
	}
}

function validateParts(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
	nodeIds: ReadonlySet<string>,
): void {
	if (!validateNamedRecord(value, path, 'parts', diagnostics)) return;
	for (const [name, definition] of Object.entries(value)) {
		validateNodeTargetDefinition(
			definition,
			`${path}.${name}`,
			PART_KEYS,
			diagnostics,
			nodeIds,
		);
	}
}

function validateSlots(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
	nodeIds: ReadonlySet<string>,
): void {
	if (!validateNamedRecord(value, path, 'slots', diagnostics)) return;
	for (const [name, definition] of Object.entries(value)) {
		const definitionPath = `${path}.${name}`;
		if (
			!validateNodeTargetDefinition(
				definition,
				definitionPath,
				SLOT_KEYS,
				diagnostics,
				nodeIds,
			)
		) {
			continue;
		}
		if (definition.capacity !== 'single' && definition.capacity !== 'multiple') {
			addUIDiagnostic(
				diagnostics,
				'invalid-asset-contract',
				`${definitionPath}.capacity`,
				'Slot capacity must be "single" or "multiple".',
			);
		}
	}
}

function validateNodeTargetDefinition(
	value: unknown,
	path: string,
	keys: ReadonlySet<string>,
	diagnostics: UIDiagnostic[],
	nodeIds: ReadonlySet<string>,
): value is Record<string, unknown> {
	if (!isPlainRecord(value)) {
		addUIDiagnostic(
			diagnostics,
			'invalid-asset-contract',
			path,
			'Definition must be an object.',
		);
		return false;
	}
	validateKnownKeys(value, keys, path, diagnostics);
	if (
		validateNonEmptyString(value.nodeId, `${path}.nodeId`, 'Node id', diagnostics) &&
		!nodeIds.has(value.nodeId)
	) {
		addUIDiagnostic(
			diagnostics,
			'unknown-node-reference',
			`${path}.nodeId`,
			`Node "${value.nodeId}" does not exist in this asset.`,
		);
	}
	if (value.required !== undefined && typeof value.required !== 'boolean') {
		addUIDiagnostic(
			diagnostics,
			'invalid-asset-contract',
			`${path}.required`,
			'Required flag must be a boolean.',
		);
	}
	if (value.description !== undefined) {
		validateNonEmptyString(value.description, `${path}.description`, 'Description', diagnostics);
	}
	return true;
}

function validateNamedRecord(
	value: unknown,
	path: string,
	label: string,
	diagnostics: UIDiagnostic[],
): value is Record<string, unknown> {
	if (!isPlainRecord(value)) {
		addUIDiagnostic(
			diagnostics,
			'invalid-asset-contract',
			path,
			`Asset contract ${label} must be an object.`,
		);
		return false;
	}
	for (const name of Object.keys(value)) {
		if (name.trim().length === 0) {
			addUIDiagnostic(
				diagnostics,
				'invalid-asset-contract',
				path,
				`Asset contract ${label} names must not be empty.`,
			);
		}
	}
	return true;
}
