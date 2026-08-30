import type { UINode } from '../model/UINode.js';
import type { UIChildTarget } from './UIOperation.js';

/**
 * Removed subtree and its exact former child location.
 */
export interface UIRemovedNode {
	/**
	 * Removed subtree root.
	 */
	readonly node: UINode;
	/**
	 * Updated immutable document root.
	 */
	readonly root: UINode;
	/**
	 * Former parent collection.
	 */
	readonly target: UIChildTarget;
	/**
	 * Former collection index.
	 */
	readonly index: number;
}

/**
 * Immutably updates a node across ordinary and projected Slot children.
 */
export function updateUINode(
	root: UINode,
	nodeId: string,
	update: (node: UINode) => UINode,
): UINode | undefined {
	if (root.id === nodeId) return update(root);

	let changed = false;
	const children = root.children.map(child => {
		const result = updateUINode(child, nodeId, update);
		if (!result) return child;
		changed = true;
		return result;
	});
	let instance = root.instance;
	if (instance) {
		let slotsChanged = false;
		const slots = Object.fromEntries(
			Object.entries(instance.slots).map(([name, nodes]) => [
				name,
				nodes.map(child => {
					const result = updateUINode(child, nodeId, update);
					if (!result) return child;
					slotsChanged = true;
					return result;
				}),
			]),
		);
		if (slotsChanged) {
			changed = true;
			instance = { ...instance, slots };
		}
	}
	return changed ? { ...root, children, ...(instance ? { instance } : {}) } : undefined;
}

/**
 * Immutably inserts a subtree into an ordinary or projected child collection.
 */
export function insertUINode(
	root: UINode,
	target: UIChildTarget,
	index: number,
	node: UINode,
): UINode | undefined {
	return updateUINode(root, target.parentId, parent => {
		if (target.collection === 'children') {
			const children = insertAt(parent.children, index, node);
			return { ...parent, children };
		}
		if (!parent.instance) return parent;
		const current = parent.instance.slots[target.slot] ?? [];
		const slots = {
			...parent.instance.slots,
			[target.slot]: insertAt(current, index, node),
		};
		return { ...parent, instance: { ...parent.instance, slots } };
	});
}

/**
 * Immutably removes a non-root subtree and records its former location.
 */
export function removeUINode(root: UINode, nodeId: string): UIRemovedNode | undefined {
	return removeFromDescendants(root, nodeId);
}

/**
 * Returns the current size of an ordinary or projected child collection.
 */
export function getUIChildCount(root: UINode, target: UIChildTarget): number | undefined {
	let count: number | undefined;
	updateUINode(root, target.parentId, parent => {
		count =
			target.collection === 'children'
				? parent.children.length
				: parent.instance?.slots[target.slot]?.length ?? 0;
		return parent;
	});
	return count;
}

function removeFromDescendants(
	parent: UINode,
	nodeId: string,
): UIRemovedNode | undefined {
	const childIndex = parent.children.findIndex(child => child.id === nodeId);
	if (childIndex >= 0) {
		return {
			node: parent.children[childIndex]!,
			root: {
				...parent,
				children: removeAt(parent.children, childIndex),
			},
			target: { collection: 'children', parentId: parent.id },
			index: childIndex,
		};
	}

	if (parent.instance) {
		for (const slot of Object.keys(parent.instance.slots).sort()) {
			const nodes = parent.instance.slots[slot]!;
			const slotIndex = nodes.findIndex(child => child.id === nodeId);
			if (slotIndex < 0) continue;
			return {
				node: nodes[slotIndex]!,
				root: {
					...parent,
					instance: {
						...parent.instance,
						slots: {
							...parent.instance.slots,
							[slot]: removeAt(nodes, slotIndex),
						},
					},
				},
				target: { collection: 'slot', parentId: parent.id, slot },
				index: slotIndex,
			};
		}
	}

	return removeNested(parent, nodeId);
}

function removeNested(parent: UINode, nodeId: string): UIRemovedNode | undefined {
	for (const child of parent.children) {
		const removed = removeFromDescendants(child, nodeId);
		if (!removed) continue;
		return {
			...removed,
			root: {
				...parent,
				children: parent.children.map(item =>
					item.id === child.id ? removed.root : item,
				),
			},
		};
	}
	if (!parent.instance) return undefined;
	for (const slot of Object.keys(parent.instance.slots).sort()) {
		const nodes = parent.instance.slots[slot]!;
		for (const child of nodes) {
			const removed = removeFromDescendants(child, nodeId);
			if (!removed) continue;
			return {
				...removed,
				root: {
					...parent,
					instance: {
						...parent.instance,
						slots: {
							...parent.instance.slots,
							[slot]: nodes.map(item =>
								item.id === child.id ? removed.root : item,
							),
						},
					},
				},
			};
		}
	}
	return undefined;
}

function insertAt<T>(values: readonly T[], index: number, value: T): readonly T[] {
	return [...values.slice(0, index), value, ...values.slice(index)];
}

function removeAt<T>(values: readonly T[], index: number): readonly T[] {
	return [...values.slice(0, index), ...values.slice(index + 1)];
}
