import type { UIDocument } from '../model/UIDocument.js';
import type { UINode } from '../model/UINode.js';
import type { UIPropertyValue } from '../model/UIPropertyValue.js';
import type { UIDiagnostic } from '../validation/UIDiagnostic.js';
import type {
	UIChildrenPolicy,
	UIPropertyValueType,
	UIResolvedComponentDefinition,
} from './UIComponentDefinition.js';
import type { UIComponentRegistry } from './UIComponentRegistry.js';
import { UIComponentResolutionError } from './UIComponentResolutionError.js';

/**
 * Validates component types, known properties, and child policies against a registry.
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
		if (!registry.has(node.type)) {
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
			if (!matchesProperty(value, property)) {
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

function matchesProperty(
	value: UIPropertyValue,
	property: UIResolvedComponentDefinition['properties'][string],
): boolean {
	const valueTypes = Array.isArray(property.valueType)
		? property.valueType
		: [property.valueType];
	if (!valueTypes.some(valueType => matchesValueType(value, valueType))) return false;
	if (property.enumValues && !property.enumValues.some(item => Object.is(item, value))) {
		return false;
	}
	if (typeof value === 'number') {
		if (property.minimum !== undefined && value < property.minimum) return false;
		if (property.maximum !== undefined && value > property.maximum) return false;
		if (property.integer && !Number.isInteger(value)) return false;
	}
	return true;
}

function matchesValueType(value: UIPropertyValue, valueType: UIPropertyValueType): boolean {
	switch (valueType) {
		case 'array':
			return Array.isArray(value);
		case 'boolean':
			return typeof value === 'boolean';
		case 'number':
			return typeof value === 'number';
		case 'object':
			return typeof value === 'object' && !Array.isArray(value);
		case 'string':
			return typeof value === 'string';
		case 'value':
			return true;
		default:
			return false;
	}
}
