const SYNTHETIC_NODE_ID_PREFIX = '__kui_node_';

/**
 * Creates a deterministic semantic id for an unnamed authored node.
 */
export function createSyntheticNodeId(path: string): string {
	return `${SYNTHETIC_NODE_ID_PREFIX}${path.replaceAll('.', '_')}`;
}

/**
 * Returns whether an id exists only to connect the semantic model internally.
 */
export function isSyntheticNodeId(id: string): boolean {
	return id.startsWith(SYNTHETIC_NODE_ID_PREFIX);
}
