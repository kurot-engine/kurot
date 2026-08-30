import { findUINode } from '../document/query.js';
import type { UIDocument } from '../model/UIDocument.js';
import type { UINode } from '../model/UINode.js';
import type { UIComponentRegistry } from '../schema/UIComponentRegistry.js';
import { matchesUIPropertyDefinition } from '../schema/matchesUIPropertyDefinition.js';
import type { UIDiagnostic } from '../validation/UIDiagnostic.js';
import { addUIDiagnostic } from '../validation/validationHelpers.js';
import type { UIAssetRegistry } from './UIAssetRegistry.js';
import { visitUINodesWithPath } from './assetTraversal.js';

/**
 * Validates component and appearance references against registered UI assets.
 */
export function validateUIAssetInstances(
	document: UIDocument,
	registry: UIAssetRegistry,
	components: UIComponentRegistry,
): UIDiagnostic[] {
	const diagnostics: UIDiagnostic[] = [];
	visitUINodesWithPath(document.root, '$.root', (node, path) => {
		validateAppearance(node, path, registry, diagnostics);
		validateInstance(node, path, registry, components, diagnostics);
	});
	return diagnostics;
}

function validateAppearance(
	node: UINode,
	path: string,
	registry: UIAssetRegistry,
	diagnostics: UIDiagnostic[],
): void {
	if (!node.appearance) return;
	const source = registry.getAsset(node.appearance.assetId);
	if (!source) {
		addUIDiagnostic(
			diagnostics,
			'unknown-ui-asset',
			`${path}.appearance.assetId`,
			`UI asset "${node.appearance.assetId}" is not registered.`,
		);
		return;
	}
	if (source.assetKind !== 'appearance' || source.contract.targetType !== node.type) {
		addUIDiagnostic(
			diagnostics,
			'invalid-component-source',
			`${path}.appearance`,
			`Appearance asset "${source.id}" does not target ${node.type}.`,
		);
	}
}

function validateInstance(
	node: UINode,
	path: string,
	registry: UIAssetRegistry,
	components: UIComponentRegistry,
	diagnostics: UIDiagnostic[],
): void {
	if (!node.instance) return;
	if (node.children.length > 0) {
		addUIDiagnostic(
			diagnostics,
			'invalid-component-instance',
			`${path}.children`,
			'Component instances accept projected children through declared slots only.',
		);
	}
	const source = registry.getAsset(node.instance.source.assetId);
	if (!source) {
		addUIDiagnostic(
			diagnostics,
			'unknown-ui-asset',
			`${path}.instance.source.assetId`,
			`UI asset "${node.instance.source.assetId}" is not registered.`,
		);
		return;
	}
	if (source.assetKind !== 'component' || source.contract.componentType !== node.type) {
		addUIDiagnostic(
			diagnostics,
			'invalid-component-source',
			`${path}.instance.source`,
			`UI asset "${source.id}" does not publish component type ${node.type}.`,
		);
		return;
	}
	validateParameters(node, path, source, diagnostics);
	validateVariant(node, path, source, diagnostics);
	validateSlots(node, path, source, diagnostics);
	validateOverrides(node, path, source, components, diagnostics);
}

function validateParameters(
	node: UINode,
	path: string,
	source: UIDocument,
	diagnostics: UIDiagnostic[],
): void {
	const values = node.instance!.parameters;
	for (const [name, definition] of Object.entries(source.contract.parameters)) {
		if (Object.hasOwn(values, name)) continue;
		if (!definition.required || definition.defaultValue !== undefined) continue;
		addUIDiagnostic(
			diagnostics,
			'missing-instance-parameter',
			`${path}.instance.parameters.${name}`,
			`Required parameter "${name}" is missing from ${node.type}.`,
		);
	}
	for (const [name, value] of Object.entries(values)) {
		const definition = source.contract.parameters[name];
		if (!definition) {
			addUIDiagnostic(
				diagnostics,
				'unknown-instance-parameter',
				`${path}.instance.parameters.${name}`,
				`Parameter "${name}" is not published by ${node.type}.`,
			);
		} else if (!matchesUIPropertyDefinition(value, definition)) {
			addUIDiagnostic(
				diagnostics,
				'invalid-component-property',
				`${path}.instance.parameters.${name}`,
				`Parameter "${name}" does not satisfy the contract of ${node.type}.`,
			);
		}
	}
}

function validateVariant(
	node: UINode,
	path: string,
	source: UIDocument,
	diagnostics: UIDiagnostic[],
): void {
	const variant = node.instance!.variant;
	if (variant === undefined || Object.hasOwn(source.contract.variants, variant)) return;
	addUIDiagnostic(
		diagnostics,
		'unknown-variant',
		`${path}.instance.variant`,
		`Variant "${variant}" is not published by ${node.type}.`,
	);
}

function validateSlots(
	node: UINode,
	path: string,
	source: UIDocument,
	diagnostics: UIDiagnostic[],
): void {
	const values = node.instance!.slots;
	for (const [name, definition] of Object.entries(source.contract.slots)) {
		if (!definition.required || (values[name]?.length ?? 0) > 0) continue;
		addUIDiagnostic(
			diagnostics,
			'missing-slot-content',
			`${path}.instance.slots.${name}`,
			`Required slot "${name}" has no projected content.`,
		);
	}
	for (const [name, children] of Object.entries(values)) {
		const definition = source.contract.slots[name];
		if (!definition) {
			addUIDiagnostic(
				diagnostics,
				'unknown-slot',
				`${path}.instance.slots.${name}`,
				`Slot "${name}" is not published by ${node.type}.`,
			);
		} else if (definition.capacity === 'single' && children.length > 1) {
			addUIDiagnostic(
				diagnostics,
				'invalid-slot-content',
				`${path}.instance.slots.${name}`,
				`Slot "${name}" accepts at most one child.`,
			);
		}
	}
}

function validateOverrides(
	node: UINode,
	path: string,
	source: UIDocument,
	components: UIComponentRegistry,
	diagnostics: UIDiagnostic[],
): void {
	for (let index = 0; index < node.instance!.overrides.length; index++) {
		const override = node.instance!.overrides[index]!;
		const part = source.contract.parts[override.part];
		const overridePath = `${path}.instance.overrides[${index}]`;
		if (!part) {
			addUIDiagnostic(
				diagnostics,
				'unknown-part',
				`${overridePath}.part`,
				`Part "${override.part}" is not published by ${node.type}.`,
			);
			continue;
		}
		const target = findUINode(source.root, part.nodeId);
		if (!target) continue;
		const definition = components.resolve(target.type);
		if (!definition) continue;
		const property = definition.properties[override.property];
		if (!property) {
			addUIDiagnostic(
				diagnostics,
				'unknown-component-property',
				`${overridePath}.property`,
				`Property "${override.property}" is not defined for part "${override.part}".`,
			);
		} else if (!matchesUIPropertyDefinition(override.value, property)) {
			addUIDiagnostic(
				diagnostics,
				'invalid-component-property',
				`${overridePath}.value`,
				`Override for "${override.property}" does not satisfy ${target.type}.`,
			);
		}
	}
}
