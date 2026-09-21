import { findUINode } from '../document/query.js';
import type {
	UIAssetContract,
	UIPropertyOverride,
} from '../model/UIAssetContract.js';
import type { UIDocument } from '../model/UIDocument.js';
import { UIEditError } from './UIEditError.js';
import type { UIOperation, UIOperationResult } from './UIOperation.js';
import {
	assertInsertIdsAvailable,
	missingValue,
	nodeNotFound,
	requireName,
	updateNode,
	validateTarget,
} from './editHelpers.js';
import { insertUINode, removeUINode, updateUINode } from './nodeTree.js';

type UINodeOperation = Extract<
	UIOperation,
	{
		readonly kind:
			| 'insert-node'
			| 'move-node'
			| 'remove-node'
			| 'remove-node-appearance'
			| 'remove-node-property'
			| 'replace-node-type'
			| 'set-node-id'
			| 'set-node-appearance'
			| 'set-node-property';
	}
>;

/**
 * Applies one structural or node-property operation and returns its inverse.
 */
export function applyNodeOperation(
	document: UIDocument,
	operation: UINodeOperation,
): UIOperationResult {
	switch (operation.kind) {
		case 'insert-node':
			return insertNode(document, operation);
		case 'remove-node':
			return removeNode(document, operation);
		case 'move-node':
			return moveNode(document, operation);
		case 'set-node-id':
			return setNodeId(document, operation);
		case 'replace-node-type':
			return updateNode(document, operation.nodeId, node => ({
				documentNode: { ...node, type: requireName(operation.type, 'Node type') },
				inverse: { kind: 'replace-node-type', nodeId: node.id, type: node.type },
			}));
		case 'set-node-property':
			return setNodeProperty(document, operation);
		case 'remove-node-property':
			return removeNodeProperty(document, operation);
		case 'set-node-appearance':
			return setNodeAppearance(document, operation);
		case 'remove-node-appearance':
			return removeNodeAppearance(document, operation);
	}
}

function setNodeId(
	document: UIDocument,
	operation: Extract<UINodeOperation, { readonly kind: 'set-node-id' }>,
): UIOperationResult {
	const node = findUINode(document.root, operation.nodeId);
	if (!node) throw nodeNotFound(operation.nodeId, '$.nodeId');
	const id = operation.id === undefined
		? availableSyntheticNodeId(document)
		: requireName(operation.id, 'Node id');
	const duplicate = findUINode(document.root, id);
	if (duplicate && duplicate !== node) {
		throw new UIEditError(
			'duplicate-node-id',
			`Node id "${id}" is already present in the document.`,
			'$.id',
		);
	}
	if (id === node.id) {
		throw new UIEditError('invalid-operation', `Node id is already "${id}".`, '$.id');
	}
	const root = updateUINode(document.root, node.id, current => ({ ...current, id }));
	if (!root) throw nodeNotFound(node.id, '$.nodeId');
	return {
		document: {
			...document,
			root,
			contract: replaceContractNodeId(document.contract, node.id, id),
		},
		inverse: { kind: 'set-node-id', nodeId: id, id: node.id },
	};
}

function availableSyntheticNodeId(document: UIDocument): string {
	let index = 0;
	while (findUINode(document.root, `__kui_node_editor_${index}`)) {
		index++;
	}
	return `__kui_node_editor_${index}`;
}

function replaceContractNodeId(contract: UIAssetContract, previous: string, next: string): UIAssetContract {
	return {
		...contract,
		parameters: Object.fromEntries(Object.entries(contract.parameters).map(([name, definition]) => [
			name,
			definition.bindings
				? {
						...definition,
						bindings: definition.bindings.map(binding =>
							binding.targetId === previous ? { ...binding, targetId: next } : binding),
					}
				: definition,
		])),
		parts: Object.fromEntries(Object.entries(contract.parts).map(([name, definition]) => [
			name,
			definition.nodeId === previous ? { ...definition, nodeId: next } : definition,
		])),
		slots: Object.fromEntries(Object.entries(contract.slots).map(([name, definition]) => [
			name,
			definition.nodeId === previous ? { ...definition, nodeId: next } : definition,
		])),
		states: Object.fromEntries(Object.entries(contract.states).map(([name, definition]) => [
			name,
			{ ...definition, overrides: replaceOverrideTargets(definition.overrides, previous, next) },
		])),
		variants: Object.fromEntries(Object.entries(contract.variants).map(([name, definition]) => [
			name,
			{ ...definition, overrides: replaceOverrideTargets(definition.overrides, previous, next) },
		])),
		...(contract.dataBindings === undefined
			? {}
			: {
					dataBindings: Object.fromEntries(Object.entries(contract.dataBindings).map(([name, definition]) => [
						name,
						definition.targetId === previous ? { ...definition, targetId: next } : definition,
					])),
				}),
		...(contract.actions === undefined
			? {}
			: {
					actions: Object.fromEntries(Object.entries(contract.actions).map(([name, definition]) => [
						name,
						definition.sourceId === previous ? { ...definition, sourceId: next } : definition,
					])),
				}),
	};
}

function replaceOverrideTargets(
	overrides: readonly UIPropertyOverride[],
	previous: string,
	next: string,
): UIPropertyOverride[] {
	return overrides.map(override =>
		override.targetId === previous ? { ...override, targetId: next } : override);
}

function insertNode(
	document: UIDocument,
	operation: Extract<UINodeOperation, { readonly kind: 'insert-node' }>,
): UIOperationResult {
	validateTarget(document.root, operation.target, operation.index);
	assertInsertIdsAvailable(document.root, operation.node);
	const root = insertUINode(document.root, operation.target, operation.index, operation.node);
	if (!root) throw nodeNotFound(operation.target.parentId, '$.target.parentId');
	return {
		document: { ...document, root },
		inverse: { kind: 'remove-node', nodeId: operation.node.id },
	};
}

function removeNode(
	document: UIDocument,
	operation: Extract<UINodeOperation, { readonly kind: 'remove-node' }>,
): UIOperationResult {
	if (document.root.id === operation.nodeId) {
		throw new UIEditError('root-operation', 'The document root cannot be removed.', '$.nodeId');
	}
	const removed = removeUINode(document.root, operation.nodeId);
	if (!removed) throw nodeNotFound(operation.nodeId, '$.nodeId');
	return {
		document: { ...document, root: removed.root },
		inverse: {
			kind: 'insert-node',
			target: removed.target,
			index: removed.index,
			node: removed.node,
		},
	};
}

function moveNode(
	document: UIDocument,
	operation: Extract<UINodeOperation, { readonly kind: 'move-node' }>,
): UIOperationResult {
	if (document.root.id === operation.nodeId) {
		throw new UIEditError('root-operation', 'The document root cannot be moved.', '$.nodeId');
	}
	const removed = removeUINode(document.root, operation.nodeId);
	if (!removed) throw nodeNotFound(operation.nodeId, '$.nodeId');
	validateTarget(removed.root, operation.target, operation.index);
	const root = insertUINode(removed.root, operation.target, operation.index, removed.node);
	if (!root) throw nodeNotFound(operation.target.parentId, '$.target.parentId');
	return {
		document: { ...document, root },
		inverse: {
			kind: 'move-node',
			nodeId: operation.nodeId,
			target: removed.target,
			index: removed.index,
		},
	};
}

function setNodeProperty(
	document: UIDocument,
	operation: Extract<UINodeOperation, { readonly kind: 'set-node-property' }>,
): UIOperationResult {
	const property = requireName(operation.property, 'Property name');
	return updateNode(document, operation.nodeId, node => ({
		documentNode: {
			...node,
			properties: { ...node.properties, [property]: operation.value },
		},
		inverse: Object.hasOwn(node.properties, property)
			? {
					kind: 'set-node-property',
					nodeId: node.id,
					property,
					value: node.properties[property]!,
				}
			: { kind: 'remove-node-property', nodeId: node.id, property },
	}));
}

function removeNodeProperty(
	document: UIDocument,
	operation: Extract<UINodeOperation, { readonly kind: 'remove-node-property' }>,
): UIOperationResult {
	return updateNode(document, operation.nodeId, node => {
		const value = node.properties[operation.property];
		if (value === undefined) throw missingValue('Node property', '$.property');
		const properties = { ...node.properties };
		delete properties[operation.property];
		return {
			documentNode: { ...node, properties },
			inverse: {
				kind: 'set-node-property',
				nodeId: node.id,
				property: operation.property,
				value,
			},
		};
	});
}

function setNodeAppearance(
	document: UIDocument,
	operation: Extract<UINodeOperation, { readonly kind: 'set-node-appearance' }>,
): UIOperationResult {
	return updateNode(document, operation.nodeId, node => ({
		documentNode: { ...node, appearance: operation.appearance },
		inverse: node.appearance
			? { kind: 'set-node-appearance', nodeId: node.id, appearance: node.appearance }
			: { kind: 'remove-node-appearance', nodeId: node.id },
	}));
}

function removeNodeAppearance(
	document: UIDocument,
	operation: Extract<UINodeOperation, { readonly kind: 'remove-node-appearance' }>,
): UIOperationResult {
	return updateNode(document, operation.nodeId, node => {
		if (!node.appearance) throw missingValue('Node appearance', '$.nodeId');
		const { appearance, ...documentNode } = node;
		return {
			documentNode,
			inverse: { kind: 'set-node-appearance', nodeId: node.id, appearance },
		};
	});
}
