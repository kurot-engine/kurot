import { UI_DOCUMENT_KIND } from '../model/UIDocument.js';
import type { UIAssetKind } from '../model/UIAssetKind.js';
import type { UIDocument } from '../model/UIDocument.js';
import { UI_DOCUMENT_FORMAT_VERSION } from '../version.js';
import type { UIDiagnostic } from './UIDiagnostic.js';
import { validateUIAssetContract } from './validateUIAssetContract.js';
import { validateUIComponentInstance } from './validateUIComponentInstance.js';
import { validateSkinPartName } from './skinPartNames.js';
import {
	addUIDiagnostic,
	isPlainRecord,
	validateAppearanceReference,
	validateKnownKeys,
	validateNonEmptyString,
	validatePropertyValue,
} from './validationHelpers.js';

const DOCUMENT_KEYS = new Set([
	'assetKind',
	'contract',
	'formatVersion',
	'id',
	'kind',
	'root',
]);
const NODE_KEYS = new Set([
	'appearance',
	'children',
	'id',
	'instance',
	'properties',
	'type',
]);

/**
 * Validates unknown input against the current semantic document format.
 */
export function validateUIDocument(value: unknown): UIDiagnostic[] {
	const diagnostics: UIDiagnostic[] = [];
	if (!isPlainRecord(value)) {
		addUIDiagnostic(diagnostics, 'invalid-document', '$', 'Document must be an object.');
		return diagnostics;
	}

	validateKnownKeys(value, DOCUMENT_KEYS, '$', diagnostics);
	validateExactValue(value.kind, UI_DOCUMENT_KIND, '$.kind', diagnostics);
	validateFormatVersion(value.formatVersion, diagnostics);
	validateNonEmptyString(value.id, '$.id', 'Document id', diagnostics);
	const assetKind = validateAssetKind(value.assetKind, diagnostics);

	const nodeIds = new Map<string, string>();
	const nodeStack = new WeakSet<object>();
	validateNode(
		value.root,
		'$.root',
		diagnostics,
		nodeIds,
		nodeStack,
		assetKind === 'appearance',
	);
	validateUIAssetContract(
		value.contract,
		assetKind,
		'$.contract',
		diagnostics,
		new Set(nodeIds.keys()),
	);
	return diagnostics;
}

/**
 * Returns whether unknown input is a valid current-format UI document.
 */
export function isUIDocument(value: unknown): value is UIDocument {
	return validateUIDocument(value).length === 0;
}

function validateNode(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
	nodeIds: Map<string, string>,
	nodeStack: WeakSet<object>,
	validateSkinNames: boolean,
): void {
	if (!isPlainRecord(value)) {
		addUIDiagnostic(diagnostics, 'invalid-value', path, 'Node must be an object.');
		return;
	}
	if (nodeStack.has(value)) {
		addUIDiagnostic(diagnostics, 'invalid-value', path, 'Node tree must not contain cycles.');
		return;
	}

	nodeStack.add(value);
	validateKnownKeys(value, NODE_KEYS, path, diagnostics);
	validateNodeId(value.id, `${path}.id`, diagnostics, nodeIds, validateSkinNames);
	validateNonEmptyString(value.type, `${path}.type`, 'Node type', diagnostics);
	validateProperties(value.properties, `${path}.properties`, diagnostics);
	if (value.appearance !== undefined) {
		validateAppearanceReference(value.appearance, `${path}.appearance`, diagnostics);
	}
	if (value.instance !== undefined) {
		validateUIComponentInstance(
			value.instance,
			`${path}.instance`,
			diagnostics,
			(child, childPath) =>
				validateNode(
					child,
					childPath,
					diagnostics,
					nodeIds,
					nodeStack,
					validateSkinNames,
				),
		);
	}
	validateChildren(
		value.children,
		`${path}.children`,
		diagnostics,
		nodeIds,
		nodeStack,
		validateSkinNames,
	);
	nodeStack.delete(value);
}

function validateChildren(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
	nodeIds: Map<string, string>,
	nodeStack: WeakSet<object>,
	validateSkinNames: boolean,
): void {
	if (!Array.isArray(value)) {
		addUIDiagnostic(diagnostics, 'invalid-value', path, 'Node children must be an array.');
		return;
	}
	for (let index = 0; index < value.length; index++) {
		validateNode(
			value[index],
			`${path}[${index}]`,
			diagnostics,
			nodeIds,
			nodeStack,
			validateSkinNames,
		);
	}
}

function validateNodeId(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
	nodeIds: Map<string, string>,
	validateSkinNames: boolean,
): void {
	if (!validateNonEmptyString(value, path, 'Node id', diagnostics)) return;
	if (validateSkinNames) {
		validateSkinPartName(value, path, diagnostics);
	}

	const firstPath = nodeIds.get(value);
	if (firstPath) {
		addUIDiagnostic(
			diagnostics,
			'duplicate-node-id',
			path,
			`Node id "${value}" is already used at ${firstPath}.`,
		);
		return;
	}
	nodeIds.set(value, path);
}

function validateProperties(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
): void {
	if (!isPlainRecord(value)) {
		addUIDiagnostic(diagnostics, 'invalid-value', path, 'Node properties must be an object.');
		return;
	}
	const valueStack = new WeakSet<object>();
	for (const [key, propertyValue] of Object.entries(value)) {
		validatePropertyValue(propertyValue, `${path}.${key}`, diagnostics, valueStack);
	}
}

function validateAssetKind(
	value: unknown,
	diagnostics: UIDiagnostic[],
): UIAssetKind | undefined {
	if (value === 'appearance' || value === 'component' || value === 'screen') {
		return value;
	}
	addUIDiagnostic(
		diagnostics,
		'invalid-asset-kind',
		'$.assetKind',
		'Asset kind must be "screen", "component", or "appearance".',
	);
	return undefined;
}

function validateFormatVersion(value: unknown, diagnostics: UIDiagnostic[]): void {
	if (!Number.isInteger(value)) {
		addUIDiagnostic(
			diagnostics,
			'invalid-value',
			'$.formatVersion',
			'Format version must be an integer.',
		);
		return;
	}
	if (value !== UI_DOCUMENT_FORMAT_VERSION) {
		addUIDiagnostic(
			diagnostics,
			'unsupported-version',
			'$.formatVersion',
			`Format version ${String(value)} is not supported. Expected ${UI_DOCUMENT_FORMAT_VERSION}.`,
		);
	}
}

function validateExactValue(
	value: unknown,
	expected: string,
	path: string,
	diagnostics: UIDiagnostic[],
): void {
	if (value !== expected) {
		addUIDiagnostic(
			diagnostics,
			'invalid-value',
			path,
			`Value must be "${expected}".`,
		);
	}
}
