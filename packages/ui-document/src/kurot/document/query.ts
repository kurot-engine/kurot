import type { UINode } from '../model/UINode.js';

/**
 * Visits a node tree in deterministic parent-before-children order.
 */
export function visitUINodes(root: UINode, visitor: (node: UINode) => void): void {
	visitor(root);
	for (const child of root.children) {
		visitUINodes(child, visitor);
	}
}

/**
 * Finds the first node with the requested identifier in pre-order.
 */
export function findUINode(root: UINode, id: string): UINode | undefined {
	if (root.id === id) return root;

	for (const child of root.children) {
		const match = findUINode(child, id);
		if (match) return match;
	}
	return undefined;
}
