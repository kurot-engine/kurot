import type { UIDocument } from '../model/UIDocument.js';
import type { UINode } from '../model/UINode.js';
import type { UIDiagnostic } from '../validation/UIDiagnostic.js';
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
		diagnostics.push({
			code: error.code,
			severity: 'error',
			path: `${path}.type`,
			message: error.message,
		});
	}
	if (!definition) {
		if (!registry.has(node.type) && !node.instance) {
			diagnostics.push({
				code: 'unknown-component-type',
				severity: 'error',
				path: `${path}.type`,
				message: `Component type "${node.type}" is not registered.`,
			});
		}
	} else {
		if (definition.abstract) {
			diagnostics.push({
				code: 'abstract-component-type',
				severity: 'error',
				path: `${path}.type`,
				message: `Abstract component type "${node.type}" cannot be instantiated.`,
			});
		}

		const properties = definition.properties;
		for (const [name, property] of Object.entries(properties)) {
			if (property.required && !Object.hasOwn(node.properties, name)) {
				diagnostics.push({
					code: 'missing-component-property',
					severity: 'error',
					path: `${path}.properties.${name}`,
					message: `Required property "${name}" is missing from ${node.type}.`,
				});
			}
		}

		for (const [name, value] of Object.entries(node.properties)) {
			const property = properties[name];
			if (!property) {
				if (!definition.allowUnknownProperties) {
					diagnostics.push({
						code: 'unknown-component-property',
						severity: 'error',
						path: `${path}.properties.${name}`,
						message: `Property "${name}" is not defined for ${node.type}.`,
					});
				}
				continue;
			}
			if (!matchesUIPropertyDefinition(value, property)) {
				diagnostics.push({
					code: 'invalid-component-property',
					severity: 'error',
					path: `${path}.properties.${name}`,
					message: `Property "${name}" on ${node.type} does not satisfy its schema.`,
				});
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

	diagnostics.push({
		code: 'invalid-component-children',
		severity: 'error',
		path: `${path}.children`,
		message:
			policy === 'none'
				? `Component ${node.type} does not accept children.`
				: `Component ${node.type} accepts at most one child.`,
	});
}
