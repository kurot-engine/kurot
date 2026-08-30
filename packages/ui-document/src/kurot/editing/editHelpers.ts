import { findUINode, visitUINodes } from '../document/query.js';
import type { UIComponentInstance } from '../model/UIComponentInstance.js';
import type { UIDocument } from '../model/UIDocument.js';
import type { UINode } from '../model/UINode.js';
import { UIEditError } from './UIEditError.js';
import type {
	UIChildTarget,
	UIOperation,
	UIOperationResult,
} from './UIOperation.js';
import { getUIChildCount, updateUINode } from './nodeTree.js';

/**
 * Replaces one node while preserving the immutable document root.
 */
export function updateNode(
	document: UIDocument,
	nodeId: string,
	update: (node: UINode) => {
		readonly documentNode: UINode;
		readonly inverse: UIOperation;
	},
): UIOperationResult {
	let inverse: UIOperation | undefined;
	const root = updateUINode(document.root, nodeId, node => {
		const result = update(node);
		inverse = result.inverse;
		return result.documentNode;
	});
	if (!root || !inverse) throw nodeNotFound(nodeId, '$.nodeId');
	return { document: { ...document, root }, inverse };
}

/**
 * Replaces the reusable-instance payload on one immutable node.
 */
export function updateInstance(
	document: UIDocument,
	nodeId: string,
	update: (instance: UIComponentInstance) => {
		readonly instance: UIComponentInstance;
		readonly inverse: UIOperation;
	},
): UIOperationResult {
	return updateNode(document, nodeId, node => {
		if (!node.instance) throw missingInstance(node.id);
		const result = update(node.instance);
		return {
			documentNode: { ...node, instance: result.instance },
			inverse: result.inverse,
		};
	});
}

/**
 * Verifies that a child collection exists and accepts the requested index.
 */
export function validateTarget(
	root: UINode,
	target: UIChildTarget,
	index: number,
): void {
	const parent = findUINode(root, target.parentId);
	if (!parent) throw nodeNotFound(target.parentId, '$.target.parentId');
	if (target.collection === 'children' && parent.instance) {
		throw new UIEditError(
			'invalid-parent',
			'Reusable instances accept projected children through Slots only.',
			'$.target',
		);
	}
	if (target.collection === 'slot' && !parent.instance) {
		throw new UIEditError(
			'invalid-parent',
			`Node "${parent.id}" is not a reusable component instance.`,
			'$.target',
		);
	}
	const count = getUIChildCount(root, target);
	if (count === undefined || !Number.isInteger(index) || index < 0 || index > count) {
		throw new UIEditError(
			'index-out-of-range',
			`Child index ${index} is outside the range 0..${String(count ?? 0)}.`,
			'$.index',
		);
	}
}

/**
 * Rejects an inserted subtree whose IDs collide with the current document.
 */
export function assertInsertIdsAvailable(root: UINode, inserted: UINode): void {
	const existing = new Set<string>();
	visitUINodes(root, node => existing.add(node.id));
	const insertedIds = new Set<string>();
	visitUINodes(inserted, node => {
		if (existing.has(node.id) || insertedIds.has(node.id)) {
			throw new UIEditError(
				'duplicate-node-id',
				`Node id "${node.id}" is already present in the document or inserted subtree.`,
				'$.node.id',
			);
		}
		insertedIds.add(node.id);
	});
}

/**
 * Returns a non-empty semantic name or raises a structured edit error.
 */
export function requireName(value: string, label: string): string {
	if (value.trim().length > 0) return value;
	throw new UIEditError('invalid-operation', `${label} must not be empty.`, '$');
}

/**
 * Creates the standard missing-node edit error.
 */
export function nodeNotFound(nodeId: string, path: string): UIEditError {
	return new UIEditError('node-not-found', `Node "${nodeId}" does not exist.`, path);
}

/**
 * Creates the standard missing-instance edit error.
 */
export function missingInstance(nodeId: string): UIEditError {
	return new UIEditError(
		'missing-instance',
		`Node "${nodeId}" is not a reusable component instance.`,
		'$.nodeId',
	);
}

/**
 * Creates the standard missing semantic value edit error.
 */
export function missingValue(label: string, path: string): UIEditError {
	return new UIEditError('invalid-operation', `${label} does not exist.`, path);
}
