import type { UIDocument } from '../model/UIDocument.js';
import type { UIOperation, UIOperationResult } from './UIOperation.js';
import {
	missingInstance,
	missingValue,
	requireName,
	updateInstance,
	updateNode,
} from './editHelpers.js';

type UIInstanceOperation = Extract<
	UIOperation,
	{
		readonly kind:
			| 'remove-instance-override'
			| 'remove-instance-parameter'
			| 'remove-instance-variant'
			| 'remove-node-instance'
			| 'set-instance-override'
			| 'set-instance-parameter'
			| 'set-instance-variant'
			| 'set-node-instance';
	}
>;

/**
 * Applies one reusable-instance operation and returns its exact inverse.
 */
export function applyInstanceOperation(
	document: UIDocument,
	operation: UIInstanceOperation,
): UIOperationResult {
	switch (operation.kind) {
		case 'set-node-instance':
			return setNodeInstance(document, operation);
		case 'remove-node-instance':
			return removeNodeInstance(document, operation);
		case 'set-instance-parameter':
			return setInstanceParameter(document, operation);
		case 'remove-instance-parameter':
			return removeInstanceParameter(document, operation);
		case 'set-instance-variant':
			return setInstanceVariant(document, operation);
		case 'remove-instance-variant':
			return removeInstanceVariant(document, operation);
		case 'set-instance-override':
			return setInstanceOverride(document, operation);
		case 'remove-instance-override':
			return removeInstanceOverride(document, operation);
	}
}

function setNodeInstance(
	document: UIDocument,
	operation: Extract<UIInstanceOperation, { readonly kind: 'set-node-instance' }>,
): UIOperationResult {
	return updateNode(document, operation.nodeId, node => ({
		documentNode: { ...node, instance: operation.instance },
		inverse: node.instance
			? { kind: 'set-node-instance', nodeId: node.id, instance: node.instance }
			: { kind: 'remove-node-instance', nodeId: node.id },
	}));
}

function removeNodeInstance(
	document: UIDocument,
	operation: Extract<UIInstanceOperation, { readonly kind: 'remove-node-instance' }>,
): UIOperationResult {
	return updateNode(document, operation.nodeId, node => {
		if (!node.instance) throw missingInstance(node.id);
		const { instance, ...documentNode } = node;
		return {
			documentNode,
			inverse: { kind: 'set-node-instance', nodeId: node.id, instance },
		};
	});
}

function setInstanceParameter(
	document: UIDocument,
	operation: Extract<UIInstanceOperation, { readonly kind: 'set-instance-parameter' }>,
): UIOperationResult {
	const parameter = requireName(operation.parameter, 'Parameter name');
	return updateInstance(document, operation.nodeId, instance => ({
		instance: {
			...instance,
			parameters: { ...instance.parameters, [parameter]: operation.value },
		},
		inverse: Object.hasOwn(instance.parameters, parameter)
			? {
					kind: 'set-instance-parameter',
					nodeId: operation.nodeId,
					parameter,
					value: instance.parameters[parameter]!,
				}
			: { kind: 'remove-instance-parameter', nodeId: operation.nodeId, parameter },
	}));
}

function removeInstanceParameter(
	document: UIDocument,
	operation: Extract<UIInstanceOperation, { readonly kind: 'remove-instance-parameter' }>,
): UIOperationResult {
	return updateInstance(document, operation.nodeId, instance => {
		const value = instance.parameters[operation.parameter];
		if (value === undefined) throw missingValue('Instance parameter', '$.parameter');
		const parameters = { ...instance.parameters };
		delete parameters[operation.parameter];
		return {
			instance: { ...instance, parameters },
			inverse: {
				kind: 'set-instance-parameter',
				nodeId: operation.nodeId,
				parameter: operation.parameter,
				value,
			},
		};
	});
}

function setInstanceVariant(
	document: UIDocument,
	operation: Extract<UIInstanceOperation, { readonly kind: 'set-instance-variant' }>,
): UIOperationResult {
	const variant = requireName(operation.variant, 'Variant name');
	return updateInstance(document, operation.nodeId, instance => ({
		instance: { ...instance, variant },
		inverse: instance.variant
			? {
					kind: 'set-instance-variant',
					nodeId: operation.nodeId,
					variant: instance.variant,
				}
			: { kind: 'remove-instance-variant', nodeId: operation.nodeId },
	}));
}

function removeInstanceVariant(
	document: UIDocument,
	operation: Extract<UIInstanceOperation, { readonly kind: 'remove-instance-variant' }>,
): UIOperationResult {
	return updateInstance(document, operation.nodeId, instance => {
		if (!instance.variant) throw missingValue('Instance variant', '$.nodeId');
		const { variant, ...nextInstance } = instance;
		return {
			instance: nextInstance,
			inverse: { kind: 'set-instance-variant', nodeId: operation.nodeId, variant },
		};
	});
}

function setInstanceOverride(
	document: UIDocument,
	operation: Extract<UIInstanceOperation, { readonly kind: 'set-instance-override' }>,
): UIOperationResult {
	return updateInstance(document, operation.nodeId, instance => {
		const index = instance.overrides.findIndex(
			item =>
				item.part === operation.override.part &&
				item.property === operation.override.property,
		);
		const overrides = [...instance.overrides];
		if (index >= 0) overrides[index] = operation.override;
		else overrides.push(operation.override);
		return {
			instance: { ...instance, overrides },
			inverse:
				index >= 0
					? {
							kind: 'set-instance-override',
							nodeId: operation.nodeId,
							override: instance.overrides[index]!,
						}
					: {
							kind: 'remove-instance-override',
							nodeId: operation.nodeId,
							part: operation.override.part,
							property: operation.override.property,
						},
		};
	});
}

function removeInstanceOverride(
	document: UIDocument,
	operation: Extract<UIInstanceOperation, { readonly kind: 'remove-instance-override' }>,
): UIOperationResult {
	return updateInstance(document, operation.nodeId, instance => {
		const index = instance.overrides.findIndex(
			item => item.part === operation.part && item.property === operation.property,
		);
		if (index < 0) throw missingValue('Instance override', '$');
		return {
			instance: {
				...instance,
				overrides: [
					...instance.overrides.slice(0, index),
					...instance.overrides.slice(index + 1),
				],
			},
			inverse: {
				kind: 'set-instance-override',
				nodeId: operation.nodeId,
				override: instance.overrides[index]!,
			},
		};
	});
}
