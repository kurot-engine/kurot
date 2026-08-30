/**
 * Builds the canonical diagnostic path of one project asset scope.
 */
export function assetPath(assetId: string, suffix = ''): string {
	return `$.assets[${JSON.stringify(assetId)}]${suffix}`;
}
