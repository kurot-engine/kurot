import type { UIDiagnostic } from '../validation/UIDiagnostic.js';

/**
 * Error raised when an in-memory document cannot be safely serialized.
 */
export class UIDocumentValidationError extends Error {
	/**
	 * Structured failures suitable for editor and Agent feedback.
	 */
	public readonly diagnostics: readonly UIDiagnostic[];

	public constructor(diagnostics: readonly UIDiagnostic[]) {
		const detail = diagnostics[0]?.message ?? 'Unknown document error.';
		super(`Unable to serialize UI document: ${detail}`);
		this.name = 'UIDocumentValidationError';
		this.diagnostics = diagnostics;
	}
}
