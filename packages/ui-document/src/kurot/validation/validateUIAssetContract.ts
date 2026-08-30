import type { UIAssetKind } from '../model/UIAssetKind.js';
import type { UIPropertyDefinition } from '../schema/UIComponentDefinition.js';
import { validateComponentDefinition } from '../schema/validateComponentDefinition.js';
import type { UIDiagnostic } from './UIDiagnostic.js';
import {
	addUIDiagnostic,
	isPlainRecord,
	validateKnownKeys,
	validateNodeIdReference,
	validateNonEmptyString,
} from './validationHelpers.js';
import { validateUIAssetModes } from './validateUIAssetModes.js';
import { validateSkinPartName } from './skinPartNames.js';

const CONTRACT_KEYS = new Set([
	'actions',
	'componentType',
	'dataBindings',
	'dataFields',
	'parameters',
	'parts',
	'slots',
	'states',
	'targetType',
	'variants',
]);
const PARAMETER_KEYS = new Set([
	'defaultValue',
	'bindings',
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
const PARAMETER_BINDING_KEYS = new Set(['property', 'targetId']);
const SLOT_KEYS = new Set(['capacity', 'description', 'nodeId', 'required']);
const ACTION_KEYS = new Set(['description', 'sourceId', 'trigger']);
const DATA_BINDING_KEYS = new Set(['property', 'source', 'targetId']);

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
	validateContractCapabilities(value, assetKind, path, diagnostics);
	validateDataFields(value.dataFields, `${path}.dataFields`, diagnostics);
	validateDataBindings(
		value.dataBindings,
		`${path}.dataBindings`,
		diagnostics,
		nodeIds,
		value.dataFields,
	);
	validateActions(value.actions, `${path}.actions`, diagnostics, nodeIds);
	validateParameters(value.parameters, `${path}.parameters`, diagnostics, nodeIds);
	validateParts(
		value.parts,
		`${path}.parts`,
		diagnostics,
		nodeIds,
		assetKind === 'appearance',
	);
	validateSlots(value.slots, `${path}.slots`, diagnostics, nodeIds);
	validateUIAssetModes(
		value.states,
		`${path}.states`,
		diagnostics,
		nodeIds,
		assetKind === 'appearance',
	);
	validateUIAssetModes(value.variants, `${path}.variants`, diagnostics, nodeIds, false);
}

function validateDataFields(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
): void {
	if (value === undefined) return;
	if (!validateNamedRecord(value, path, 'data fields', diagnostics)) return;
	for (const [name, definition] of Object.entries(value)) {
		if (!isPlainRecord(definition)) {
			addUIDiagnostic(
				diagnostics,
				'invalid-asset-contract',
				`${path}.${name}`,
				'Data field definition must be an object.',
			);
			continue;
		}
		try {
			validateComponentDefinition({
				type: 'kurot.ContractData',
				properties: { [name]: definition as unknown as UIPropertyDefinition },
			});
		} catch (error) {
			addUIDiagnostic(
				diagnostics,
				'invalid-asset-contract',
				`${path}.${name}`,
				error instanceof Error ? error.message : 'Invalid data field definition.',
			);
		}
	}
}

function validateDataBindings(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
	nodeIds: ReadonlySet<string>,
	dataFields: unknown,
): void {
	if (value === undefined) return;
	if (!validateNamedRecord(value, path, 'data bindings', diagnostics)) return;
	const fields = isPlainRecord(dataFields) ? dataFields : {};
	for (const [name, binding] of Object.entries(value)) {
		const bindingPath = `${path}.${name}`;
		if (!isPlainRecord(binding)) {
			addUIDiagnostic(
				diagnostics,
				'invalid-asset-contract',
				bindingPath,
				'Data binding must be an object.',
			);
			continue;
		}
		validateKnownKeys(binding, DATA_BINDING_KEYS, bindingPath, diagnostics);
		if (
			validateNonEmptyString(
				binding.source,
				`${bindingPath}.source`,
				'Data source',
				diagnostics,
			)
		) {
			if (!(binding.source in fields)) {
				addUIDiagnostic(
					diagnostics,
					'invalid-asset-contract',
					`${bindingPath}.source`,
					`Data field "${binding.source}" is not declared.`,
				);
			}
		}
		validateNodeIdReference(
			binding.targetId,
			`${bindingPath}.targetId`,
			'Target node id',
			diagnostics,
			nodeIds,
		);
		validateNonEmptyString(
			binding.property,
			`${bindingPath}.property`,
			'Property name',
			diagnostics,
		);
	}
}

function validateActions(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
	nodeIds: ReadonlySet<string>,
): void {
	if (value === undefined) return;
	if (!validateNamedRecord(value, path, 'actions', diagnostics)) return;
	for (const [name, definition] of Object.entries(value)) {
		const definitionPath = `${path}.${name}`;
		if (!isPlainRecord(definition)) {
			addUIDiagnostic(
				diagnostics,
				'invalid-asset-contract',
				definitionPath,
				'Action definition must be an object.',
			);
			continue;
		}
		validateKnownKeys(definition, ACTION_KEYS, definitionPath, diagnostics);
		validateNodeIdReference(
			definition.sourceId,
			`${definitionPath}.sourceId`,
			'Action source node id',
			diagnostics,
			nodeIds,
		);
		if (definition.trigger !== 'change' && definition.trigger !== 'tap') {
			addUIDiagnostic(
				diagnostics,
				'invalid-asset-contract',
				`${definitionPath}.trigger`,
				'Action trigger must be "change" or "tap".',
			);
		}
		if (definition.description !== undefined) {
			validateNonEmptyString(
				definition.description,
				`${definitionPath}.description`,
				'Description',
				diagnostics,
			);
		}
	}
}

function validateContractCapabilities(
	value: Record<string, unknown>,
	assetKind: UIAssetKind | undefined,
	path: string,
	diagnostics: UIDiagnostic[],
): void {
	if (assetKind === 'screen') {
		validateEmptyRecord(value.parameters, `${path}.parameters`, 'parameters', diagnostics);
		validateEmptyRecord(value.slots, `${path}.slots`, 'Slots', diagnostics);
		validateEmptyRecord(value.states, `${path}.states`, 'states', diagnostics);
		validateEmptyRecord(value.variants, `${path}.variants`, 'variants', diagnostics);
	}
	if (assetKind === 'appearance') {
		validateEmptyRecord(value.parameters, `${path}.parameters`, 'parameters', diagnostics);
		validateEmptyRecord(value.slots, `${path}.slots`, 'Slots', diagnostics);
		validateEmptyRecord(value.dataFields, `${path}.dataFields`, 'data fields', diagnostics);
		validateEmptyRecord(value.dataBindings, `${path}.dataBindings`, 'data bindings', diagnostics);
		validateEmptyRecord(value.actions, `${path}.actions`, 'actions', diagnostics);
	}
}

function validateEmptyRecord(
	value: unknown,
	path: string,
	label: string,
	diagnostics: UIDiagnostic[],
): void {
	if (!isPlainRecord(value) || Object.keys(value).length === 0) {
		return;
	}
	addUIDiagnostic(
		diagnostics,
		'invalid-asset-contract',
		path,
		`This asset kind does not support ${label}.`,
	);
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
	nodeIds: ReadonlySet<string>,
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
		validateParameterBindings(
			definition.bindings,
			`${definitionPath}.bindings`,
			diagnostics,
			nodeIds,
		);
	}
}

function validateParameterBindings(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
	nodeIds: ReadonlySet<string>,
): void {
	if (value === undefined) return;
	if (!Array.isArray(value)) {
		addUIDiagnostic(
			diagnostics,
			'invalid-asset-contract',
			path,
			'Parameter bindings must be an array.',
		);
		return;
	}
	for (let index = 0; index < value.length; index++) {
		const binding = value[index];
		const bindingPath = `${path}[${index}]`;
		if (!isPlainRecord(binding)) {
			addUIDiagnostic(
				diagnostics,
				'invalid-asset-contract',
				bindingPath,
				'Parameter binding must be an object.',
			);
			continue;
		}
		validateKnownKeys(binding, PARAMETER_BINDING_KEYS, bindingPath, diagnostics);
		validateNodeIdReference(
			binding.targetId,
			`${bindingPath}.targetId`,
			'Target node id',
			diagnostics,
			nodeIds,
		);
		validateNonEmptyString(
			binding.property,
			`${bindingPath}.property`,
			'Property name',
			diagnostics,
		);
	}
}

function validateParts(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
	nodeIds: ReadonlySet<string>,
	validateSkinNames: boolean,
): void {
	if (!validateNamedRecord(value, path, 'parts', diagnostics)) return;
	for (const [name, definition] of Object.entries(value)) {
		if (validateSkinNames) {
			validateSkinPartName(name, `${path}.${name}`, diagnostics);
		}
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
	validateNodeIdReference(value.nodeId, `${path}.nodeId`, 'Node id', diagnostics, nodeIds);
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
