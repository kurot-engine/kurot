import type { UIComponentInstance } from '../model/UIComponentInstance.js';
import type { UIDocument } from '../model/UIDocument.js';
import type { UINode } from '../model/UINode.js';
import type { UIChildTarget } from './UIOperation.js';

/**
 * Stable semantic change categories used by review and history interfaces.
 */
export type UIDocumentChangeKind =
	| 'appearance-changed'
	| 'contract-changed'
	| 'instance-changed'
	| 'node-added'
	| 'node-moved'
	| 'node-property-changed'
	| 'node-removed'
	| 'node-type-changed';

/**
 * One deterministic difference between two semantic document snapshots.
 */
export interface UIDocumentChange {
	/**
	 * Semantic category suitable for editor grouping.
	 */
	readonly kind: UIDocumentChangeKind;

	/**
	 * Stable node identity when the change belongs to a node.
	 */
	readonly nodeId?: string;

	/**
	 * JSON-style path in the resulting semantic document.
	 */
	readonly path: string;

	/**
	 * Value from the input snapshot when meaningful.
	 */
	readonly before?: unknown;

	/**
	 * Value from the resulting snapshot when meaningful.
	 */
	readonly after?: unknown;
}

interface IndexedNode {
	readonly node: UINode;
	readonly target?: UIChildTarget;
	readonly index: number;
}

/**
 * Produces a deterministic semantic summary without mutating either document.
 */
export function diffUIDocuments(
	before: UIDocument,
	after: UIDocument,
): readonly UIDocumentChange[] {
	const changes: UIDocumentChange[] = [];
	if (!equalValue(before.contract, after.contract)) {
		changes.push({
			kind: 'contract-changed',
			path: '$.contract',
			before: before.contract,
			after: after.contract,
		});
	}
	const beforeNodes = indexNodes(before.root);
	const afterNodes = indexNodes(after.root);
	const nodeIds = [...new Set([...beforeNodes.keys(), ...afterNodes.keys()])].sort();
	for (const nodeId of nodeIds) {
		diffNode(nodeId, beforeNodes.get(nodeId), afterNodes.get(nodeId), changes);
	}
	return changes;
}

function diffNode(
	nodeId: string,
	before: IndexedNode | undefined,
	after: IndexedNode | undefined,
	changes: UIDocumentChange[],
): void {
	if (!before && after) {
		changes.push({ kind: 'node-added', nodeId, path: nodePath(nodeId), after: after.node });
		return;
	}
	if (before && !after) {
		changes.push({ kind: 'node-removed', nodeId, path: nodePath(nodeId), before: before.node });
		return;
	}
	if (!before || !after) return;
	if (!equalValue(before.target, after.target) || before.index !== after.index) {
		changes.push({
			kind: 'node-moved',
			nodeId,
			path: nodePath(nodeId),
			before: { target: before.target, index: before.index },
			after: { target: after.target, index: after.index },
		});
	}
	if (before.node.type !== after.node.type) {
		changes.push({
			kind: 'node-type-changed',
			nodeId,
			path: `${nodePath(nodeId)}.type`,
			before: before.node.type,
			after: after.node.type,
		});
	}
	diffProperties(nodeId, before.node, after.node, changes);
	if (!equalValue(withoutSlots(before.node.instance), withoutSlots(after.node.instance))) {
		changes.push({
			kind: 'instance-changed',
			nodeId,
			path: `${nodePath(nodeId)}.instance`,
			before: withoutSlots(before.node.instance),
			after: withoutSlots(after.node.instance),
		});
	}
	if (!equalValue(before.node.appearance, after.node.appearance)) {
		changes.push({
			kind: 'appearance-changed',
			nodeId,
			path: `${nodePath(nodeId)}.appearance`,
			before: before.node.appearance,
			after: after.node.appearance,
		});
	}
}

function diffProperties(
	nodeId: string,
	before: UINode,
	after: UINode,
	changes: UIDocumentChange[],
): void {
	const names = [
		...new Set([...Object.keys(before.properties), ...Object.keys(after.properties)]),
	].sort();
	for (const name of names) {
		if (equalValue(before.properties[name], after.properties[name])) continue;
		changes.push({
			kind: 'node-property-changed',
			nodeId,
			path: `${nodePath(nodeId)}.properties.${name}`,
			before: before.properties[name],
			after: after.properties[name],
		});
	}
}

function indexNodes(root: UINode): ReadonlyMap<string, IndexedNode> {
	const nodes = new Map<string, IndexedNode>();
	visit(root, undefined, 0, nodes);
	return nodes;
}

function visit(
	node: UINode,
	target: UIChildTarget | undefined,
	index: number,
	nodes: Map<string, IndexedNode>,
): void {
	nodes.set(node.id, {
		node,
		...(target === undefined ? {} : { target }),
		index,
	});
	for (let childIndex = 0; childIndex < node.children.length; childIndex++) {
		visit(
			node.children[childIndex]!,
			{ collection: 'children', parentId: node.id },
			childIndex,
			nodes,
		);
	}
	if (!node.instance) return;
	for (const slot of Object.keys(node.instance.slots).sort()) {
		const children = node.instance.slots[slot]!;
		for (let childIndex = 0; childIndex < children.length; childIndex++) {
			visit(
				children[childIndex]!,
				{ collection: 'slot', parentId: node.id, slot },
				childIndex,
				nodes,
			);
		}
	}
}

function withoutSlots(instance?: UIComponentInstance): unknown {
	if (!instance) return undefined;
	const { slots: _slots, ...value } = instance;
	return value;
}

function equalValue(a: unknown, b: unknown): boolean {
	return stableStringify(a) === stableStringify(b);
}

function stableStringify(value: unknown): string {
	return JSON.stringify(normalize(value));
}

function normalize(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(normalize);
	if (typeof value !== 'object' || value === null) return value;
	return Object.fromEntries(
		Object.entries(value)
			.sort(([a], [b]) => compareStrings(a, b))
			.map(([key, child]) => [key, normalize(child)]),
	);
}

function nodePath(nodeId: string): string {
	return `$.nodes[${JSON.stringify(nodeId)}]`;
}

function compareStrings(a: string, b: string): number {
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
}
