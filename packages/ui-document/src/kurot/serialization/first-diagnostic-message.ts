import type { UIDiagnostic } from '../validation/UIDiagnostic.js';

/**
 * Returns the first diagnostic message, or a stable fallback when empty.
 */
export function firstDiagnosticMessage(diagnostics: readonly UIDiagnostic[]): string {
	return diagnostics[0]?.message ?? 'Unknown document error.';
}
