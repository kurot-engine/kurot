/**
 * Shared string assertions and ordering used across model, schema, and
 * editing modules.
 */

/**
 * Throws when a constructor input string is empty.
 */
export function assertNonEmpty(value: string, label: string): void {
	if (value.trim().length === 0) {
		throw new Error(`${label} must not be empty.`);
	}
}

/**
 * Throws when a definition field is not a non-empty string.
 * Accepts insufficiently validated input at schema boundaries.
 */
export function assertNonEmptyString(value: string, label: string): void {
	if (typeof value !== 'string' || value.trim().length === 0) {
		throw new Error(`${label} must be a non-empty string.`);
	}
}

/**
 * Deterministic three-way string comparison for stable sorted output.
 */
export function compareStrings(a: string, b: string): number {
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
}
