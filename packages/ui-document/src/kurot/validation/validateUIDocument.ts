import { UI_DOCUMENT_KIND } from '../model/UIDocument.js';
import type { UIDocument } from '../model/UIDocument.js';
import { UI_DOCUMENT_FORMAT_VERSION } from '../version.js';
import type { UIDiagnostic, UIDiagnosticCode } from './UIDiagnostic.js';

const DOCUMENT_KEYS = new Set(['kind', 'formatVersion', 'id', 'root']);
const NODE_KEYS = new Set(['id', 'type', 'properties', 'children']);

/**
 * Validates unknown input against the current semantic document format.
 */
export function validateUIDocument(value: unknown): UIDiagnostic[] {
	const diagnostics: UIDiagnostic[] = [];
	if (!isRecord(value)) {
		addDiagnostic(diagnostics, 'invalid-document', '$', 'Document must be an object.');
		return diagnostics;
	}

	validateKnownKeys(value, DOCUMENT_KEYS, '$', diagnostics);
	validateExactValue(value.kind, UI_DOCUMENT_KIND, '$.kind', diagnostics);
	validateFormatVersion(value.formatVersion, diagnostics);
	validateNonEmptyString(value.id, '$.id', 'Document id', diagnostics);

	const nodeIds = new Map<string, string>();
	const nodeStack = new WeakSet<object>();
	validateNode(value.root, '$.root', diagnostics, nodeIds, nodeStack);
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
): void {
	if (!isRecord(value)) {
		addDiagnostic(diagnostics, 'invalid-value', path, 'Node must be an object.');
		return;
	}
	if (nodeStack.has(value)) {
		addDiagnostic(diagnostics, 'invalid-value', path, 'Node tree must not contain cycles.');
		return;
	}

	nodeStack.add(value);
	validateKnownKeys(value, NODE_KEYS, path, diagnostics);
	validateNodeId(value.id, `${path}.id`, diagnostics, nodeIds);
	validateNonEmptyString(value.type, `${path}.type`, 'Node type', diagnostics);
	validateProperties(value.properties, `${path}.properties`, diagnostics);

	if (!Array.isArray(value.children)) {
		addDiagnostic(
			diagnostics,
			'invalid-value',
			`${path}.children`,
			'Node children must be an array.',
		);
	} else {
		for (let index = 0; index < value.children.length; index++) {
			validateNode(
				value.children[index],
				`${path}.children[${index}]`,
				diagnostics,
				nodeIds,
				nodeStack,
			);
		}
	}
	nodeStack.delete(value);
}

function validateNodeId(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
	nodeIds: Map<string, string>,
): void {
	if (!validateNonEmptyString(value, path, 'Node id', diagnostics)) return;

	const firstPath = nodeIds.get(value);
	if (firstPath) {
		addDiagnostic(
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
	if (!isRecord(value)) {
		addDiagnostic(diagnostics, 'invalid-value', path, 'Node properties must be an object.');
		return;
	}

	const valueStack = new WeakSet<object>();
	for (const [key, propertyValue] of Object.entries(value)) {
		validatePropertyValue(propertyValue, `${path}.${key}`, diagnostics, valueStack);
	}
}

function validatePropertyValue(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
	valueStack: WeakSet<object>,
): void {
	if (typeof value === 'string' || typeof value === 'boolean') return;
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) {
			addDiagnostic(
				diagnostics,
				'invalid-property-value',
				path,
				'Numeric property values must be finite.',
			);
		}
		return;
	}
	if (!value || typeof value !== 'object') {
		addDiagnostic(
			diagnostics,
			'invalid-property-value',
			path,
			'Property value must be serializable and must not be null or undefined.',
		);
		return;
	}
	if (valueStack.has(value)) {
		addDiagnostic(
			diagnostics,
			'invalid-property-value',
			path,
			'Property value must not contain cyclic references.',
		);
		return;
	}

	valueStack.add(value);
	if (Array.isArray(value)) {
		for (let index = 0; index < value.length; index++) {
			validatePropertyValue(value[index], `${path}[${index}]`, diagnostics, valueStack);
		}
	} else if (isRecord(value)) {
		for (const [key, nestedValue] of Object.entries(value)) {
			validatePropertyValue(nestedValue, `${path}.${key}`, diagnostics, valueStack);
		}
	} else {
		addDiagnostic(
			diagnostics,
			'invalid-property-value',
			path,
			'Property object must be a plain string-keyed object.',
		);
	}
	valueStack.delete(value);
}

function validateFormatVersion(value: unknown, diagnostics: UIDiagnostic[]): void {
	if (!Number.isInteger(value)) {
		addDiagnostic(
			diagnostics,
			'invalid-value',
			'$.formatVersion',
			'Format version must be an integer.',
		);
		return;
	}
	if (value !== UI_DOCUMENT_FORMAT_VERSION) {
		addDiagnostic(
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
		addDiagnostic(
			diagnostics,
			'invalid-value',
			path,
			`Value must be "${expected}".`,
		);
	}
}

function validateNonEmptyString(
	value: unknown,
	path: string,
	label: string,
	diagnostics: UIDiagnostic[],
): value is string {
	if (typeof value !== 'string' || value.trim().length === 0) {
		addDiagnostic(diagnostics, 'invalid-value', path, `${label} must be a non-empty string.`);
		return false;
	}
	return true;
}

function validateKnownKeys(
	value: Record<string, unknown>,
	knownKeys: ReadonlySet<string>,
	path: string,
	diagnostics: UIDiagnostic[],
): void {
	for (const key of Object.keys(value)) {
		if (knownKeys.has(key)) continue;
		addDiagnostic(
			diagnostics,
			'unexpected-property',
			`${path}.${key}`,
			`Property "${key}" is not part of the current document format.`,
		);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const prototype = Object.getPrototypeOf(value) as object | null;
	return prototype === Object.prototype || prototype === null;
}

function addDiagnostic(
	diagnostics: UIDiagnostic[],
	code: UIDiagnosticCode,
	path: string,
	message: string,
): void {
	diagnostics.push({ code, severity: 'error', path, message });
}
