/**
 * Returns a collision-free runtime identity for a node inside a component scope.
 */
export function qualifyNodeId(scope: string, nodeId: string): string {
	return scope ? `${scope}/${nodeId}` : nodeId;
}
