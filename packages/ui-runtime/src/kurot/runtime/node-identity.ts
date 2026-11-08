/**
 * Escape authored delimiters before composing a path. Ordinary IDs keep their
 * existing keys, and a literal escape sequence cannot impersonate a delimiter.
 */
function escapeSegment(id: string): string {
	return id.replaceAll('%', '%25').replaceAll('/', '%2F').replaceAll('@appearance:', '%40appearance:');
}

/**
 * Returns the lookup key for an authored ID under an already-qualified parent
 * scope. Pass an empty scope for a top-level node.
 */
export function qualifyNodeId(scope: string, nodeId: string): string {
	const segment = escapeSegment(nodeId);
	return scope ? `${scope}/${segment}` : segment;
}

/**
 * Returns the scope of an appearance attached to an already-qualified host.
 * Use the result as the parent scope when looking up appearance nodes.
 */
export function qualifyAppearanceScope(hostIdentity: string, assetId: string): string {
	return `${hostIdentity}@appearance:${escapeSegment(assetId)}`;
}
