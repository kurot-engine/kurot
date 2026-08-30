import type { UIDiagnostic, UIDiagnosticCode } from './UIDiagnostic.js';

const RESOURCE_TYPES = new Set([
	'animation',
	'font',
	'image',
	'spine',
	'sprite-frame',
]);
const TOKEN_TYPES = new Set([
	'color',
	'number',
	'spacing',
	'string',
	'typography',
]);

/**
 * Adds one stable error diagnostic to a mutable validation result.
 */
export function addUIDiagnostic(
	diagnostics: UIDiagnostic[],
	code: UIDiagnosticCode,
	path: string,
	message: string,
): void {
	diagnostics.push({ code, severity: 'error', path, message });
}

/**
 * Returns whether a value is a plain string-keyed object.
 */
export function isPlainRecord(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const prototype = Object.getPrototypeOf(value) as object | null;
	return prototype === Object.prototype || prototype === null;
}

/**
 * Reports object keys that are outside an exact semantic shape.
 */
export function validateKnownKeys(
	value: Record<string, unknown>,
	knownKeys: ReadonlySet<string>,
	path: string,
	diagnostics: UIDiagnostic[],
): void {
	for (const key of Object.keys(value)) {
		if (knownKeys.has(key)) continue;
		addUIDiagnostic(
			diagnostics,
			'unexpected-property',
			`${path}.${key}`,
			`Property "${key}" is not part of the current document format.`,
		);
	}
}

/**
 * Validates a required non-empty semantic identifier.
 */
export function validateNonEmptyString(
	value: unknown,
	path: string,
	label: string,
	diagnostics: UIDiagnostic[],
): value is string {
	if (typeof value !== 'string' || value.trim().length === 0) {
		addUIDiagnostic(diagnostics, 'invalid-value', path, `${label} must be a non-empty string.`);
		return false;
	}
	return true;
}

/**
 * Validates one recursive serializable property value and tagged references.
 */
export function validatePropertyValue(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
	valueStack: WeakSet<object> = new WeakSet(),
): void {
	if (typeof value === 'string' || typeof value === 'boolean') return;
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) {
			addUIDiagnostic(
				diagnostics,
				'invalid-property-value',
				path,
				'Numeric property values must be finite.',
			);
		}
		return;
	}
	if (!value || typeof value !== 'object') {
		addUIDiagnostic(
			diagnostics,
			'invalid-property-value',
			path,
			'Property value must be serializable and must not be null or undefined.',
		);
		return;
	}
	if (valueStack.has(value)) {
		addUIDiagnostic(
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
	} else if (isPlainRecord(value)) {
		validateTaggedReference(value, path, diagnostics);
		for (const [key, nestedValue] of Object.entries(value)) {
			validatePropertyValue(nestedValue, `${path}.${key}`, diagnostics, valueStack);
		}
	} else {
		addUIDiagnostic(
			diagnostics,
			'invalid-property-value',
			path,
			'Property object must be a plain string-keyed object.',
		);
	}
	valueStack.delete(value);
}

/**
 * Validates a stable reference to another editable UI asset.
 */
export function validateAssetReference(
	value: unknown,
	path: string,
	diagnostics: UIDiagnostic[],
): void {
	if (!isPlainRecord(value)) {
		addUIDiagnostic(diagnostics, 'invalid-asset-reference', path, 'Asset reference must be an object.');
		return;
	}
	validateKnownKeys(value, new Set(['assetId', 'kind']), path, diagnostics);
	if (value.kind !== 'asset') {
		addUIDiagnostic(
			diagnostics,
			'invalid-asset-reference',
			`${path}.kind`,
			'Asset reference kind must be "asset".',
		);
	}
	validateNonEmptyString(value.assetId, `${path}.assetId`, 'Asset id', diagnostics);
}

function validateTaggedReference(
	value: Record<string, unknown>,
	path: string,
	diagnostics: UIDiagnostic[],
): void {
	if (value.kind === 'resource') {
		validateKnownKeys(value, new Set(['key', 'kind', 'resourceType']), path, diagnostics);
		validateNonEmptyString(value.key, `${path}.key`, 'Resource key', diagnostics);
		if (!RESOURCE_TYPES.has(String(value.resourceType))) {
			addUIDiagnostic(
				diagnostics,
				'invalid-resource-reference',
				`${path}.resourceType`,
				`Unsupported resource type "${String(value.resourceType)}".`,
			);
		}
	} else if (value.kind === 'token') {
		validateKnownKeys(value, new Set(['key', 'kind', 'tokenType']), path, diagnostics);
		validateNonEmptyString(value.key, `${path}.key`, 'Token key', diagnostics);
		if (!TOKEN_TYPES.has(String(value.tokenType))) {
			addUIDiagnostic(
				diagnostics,
				'invalid-token-reference',
				`${path}.tokenType`,
				`Unsupported token type "${String(value.tokenType)}".`,
			);
		}
	} else if (value.kind === 'asset') {
		validateAssetReference(value, path, diagnostics);
	}
}
