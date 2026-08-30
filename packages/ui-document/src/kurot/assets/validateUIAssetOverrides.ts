import { findUINode } from '../document/query.js';
import type { UIPropertyOverride } from '../model/UIAssetContract.js';
import type { UIDocument } from '../model/UIDocument.js';
import type { UIComponentRegistry } from '../schema/UIComponentRegistry.js';
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
	validateModes(document, 'states', components, diagnostics);
	validateModes(document, 'variants', components, diagnostics);
	return diagnostics;
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
	if (matchesUIPropertyDefinition(override.value, property)) return;
	addUIDiagnostic(
		diagnostics,
		'invalid-component-property',
		`${path}.value`,
		`Override for "${override.property}" does not satisfy the schema of ${target.type}.`,
	);
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
