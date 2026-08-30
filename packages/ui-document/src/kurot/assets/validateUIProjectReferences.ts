import type { UIDocument } from '../model/UIDocument.js';
import type { UIPropertyValue } from '../model/UIPropertyValue.js';
import {
	isUIAssetReference,
	isUIDesignTokenReference,
	isUIResourceReference,
} from '../model/UIReference.js';
import type { UIDiagnostic } from '../validation/UIDiagnostic.js';
import { addUIDiagnostic } from '../validation/validationHelpers.js';
import type { UIAssetRegistry } from './UIAssetRegistry.js';
import { visitUIDocumentPropertyValues } from './assetTraversal.js';

/**
 * Validates typed resource, token, and generic asset references in one document.
 */
export function validateUIProjectReferences(
	document: UIDocument,
	registry: UIAssetRegistry,
): UIDiagnostic[] {
	const diagnostics: UIDiagnostic[] = [];
	visitUIDocumentPropertyValues(document, (value, path) => {
		validateResourceReference(value, path, registry, diagnostics);
		validateTokenReference(value, path, registry, diagnostics);
		validateAssetReference(value, path, registry, diagnostics);
	});
	return diagnostics;
}

function validateResourceReference(
	value: UIPropertyValue,
	path: string,
	registry: UIAssetRegistry,
	diagnostics: UIDiagnostic[],
): void {
	if (!isUIResourceReference(value)) return;
	const definition = registry.getResource(value.key);
	if (!definition) {
		addUIDiagnostic(
			diagnostics,
			'unknown-resource',
			`${path}.key`,
			`UI resource "${value.key}" is not registered.`,
		);
		return;
	}
	if (definition.resourceType === value.resourceType) return;
	addUIDiagnostic(
		diagnostics,
		'resource-type-mismatch',
		`${path}.resourceType`,
		`Resource "${value.key}" has type "${definition.resourceType}", not "${String(value.resourceType)}".`,
	);
}

function validateTokenReference(
	value: UIPropertyValue,
	path: string,
	registry: UIAssetRegistry,
	diagnostics: UIDiagnostic[],
): void {
	if (!isUIDesignTokenReference(value)) return;
	const definition = registry.getToken(value.key);
	if (!definition) {
		addUIDiagnostic(
			diagnostics,
			'unknown-token',
			`${path}.key`,
			`UI design token "${value.key}" is not registered.`,
		);
		return;
	}
	if (definition.tokenType === value.tokenType) return;
	addUIDiagnostic(
		diagnostics,
		'token-type-mismatch',
		`${path}.tokenType`,
		`Token "${value.key}" has type "${definition.tokenType}", not "${String(value.tokenType)}".`,
	);
}

function validateAssetReference(
	value: UIPropertyValue,
	path: string,
	registry: UIAssetRegistry,
	diagnostics: UIDiagnostic[],
): void {
	if (!isUIAssetReference(value) || registry.getAsset(value.assetId)) return;
	addUIDiagnostic(
		diagnostics,
		'unknown-ui-asset',
		`${path}.assetId`,
		`UI asset "${value.assetId}" is not registered.`,
	);
}
