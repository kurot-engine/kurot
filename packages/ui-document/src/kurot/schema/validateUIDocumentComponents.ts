import type { UIDocument } from '../model/UIDocument.js';
import type { UINode } from '../model/UINode.js';
import type { UIDiagnostic } from '../validation/UIDiagnostic.js';
import { addUIDiagnostic } from '../validation/validationHelpers.js';
import type {
	UIChildrenPolicy,
	UIResolvedComponentDefinition,
} from './UIComponentDefinition.js';
import type { UIComponentRegistry } from './UIComponentRegistry.js';
import { UIComponentResolutionError } from './UIComponentResolutionError.js';
import { matchesUIPropertyDefinition } from './matchesUIPropertyDefinition.js';

/**
 * Validates component types, known properties, and child policies against a registry.
 * Reusable instance types are resolved by project asset validation instead.
 * The document must first pass validateUIDocument.
 */
export function validateUIDocumentComponents(
	document: UIDocument,
	registry: UIComponentRegistry,
): UIDiagnostic[] {
	const diagnostics: UIDiagnostic[] = [];
	validateNode(document.root, '$.root', registry, diagnostics);
	return diagnostics;
}

function validateNode(
	node: UINode,
	path: string,
	registry: UIComponentRegistry,
	diagnostics: UIDiagnostic[],
): void {
	let definition: UIResolvedComponentDefinition | undefined;
	try {
		definition = registry.resolve(node.type);
	} catch (error) {
		if (!(error instanceof UIComponentResolutionError)) throw error;
		addUIDiagnostic(diagnostics, error.code, `${path}.type`, error.message);
	}
	if (!definition) {
		if (!registry.has(node.type) && !node.instance) {
			addUIDiagnostic(
				diagnostics,
				'unknown-component-type',
				`${path}.type`,
				`Component type "${node.type}" is not registered.`,
			);
		}
	} else {
		if (definition.abstract) {
			addUIDiagnostic(
				diagnostics,
				'abstract-component-type',
				`${path}.type`,
				`Abstract component type "${node.type}" cannot be instantiated.`,
			);
		}

		const properties = definition.properties;
		for (const [name, property] of Object.entries(properties)) {
			if (property.required && !Object.hasOwn(node.properties, name)) {
				addUIDiagnostic(
					diagnostics,
					'missing-component-property',
					`${path}.properties.${name}`,
					`Required property "${name}" is missing from ${node.type}.`,
				);
			}
		}

		for (const [name, value] of Object.entries(node.properties)) {
			const property = properties[name];
			if (!property) {
				if (!definition.allowUnknownProperties) {
					addUIDiagnostic(
						diagnostics,
						'unknown-component-property',
						`${path}.properties.${name}`,
						`Property "${name}" is not defined for ${node.type}.`,
					);
				}
				continue;
			}
			if (!matchesUIPropertyDefinition(value, property)) {
				addUIDiagnostic(
					diagnostics,
					'invalid-component-property',
					`${path}.properties.${name}`,
					`Property "${name}" on ${node.type} does not satisfy its schema.`,
				);
			}
		}

		validateChildren(node, path, diagnostics, definition.children);
	}

	for (let index = 0; index < node.children.length; index++) {
		validateNode(node.children[index]!, `${path}.children[${index}]`, registry, diagnostics);
	}
	if (!node.instance) return;
	for (const slotName of Object.keys(node.instance.slots).sort()) {
		const children = node.instance.slots[slotName]!;
		for (let index = 0; index < children.length; index++) {
			validateNode(
				children[index]!,
				`${path}.instance.slots.${slotName}[${index}]`,
				registry,
				diagnostics,
			);
		}
	}
}

function validateChildren(
	node: UINode,
	path: string,
	diagnostics: UIDiagnostic[],
	policy?: UIChildrenPolicy,
): void {
	const invalid =
		(policy === 'none' && node.children.length !== 0) ||
		(policy === 'single' && node.children.length > 1);
	if (!invalid) return;

	addUIDiagnostic(
		diagnostics,
		'invalid-component-children',
		`${path}.children`,
		policy === 'none'
			? `Component ${node.type} does not accept children.`
			: `Component ${node.type} accepts at most one child.`,
	);
}
