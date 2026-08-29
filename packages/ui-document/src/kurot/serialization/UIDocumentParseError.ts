import type { UIDiagnostic } from '../validation/UIDiagnostic.js';

/**
 * Error raised when JSON cannot be decoded as a current-format UI document.
 */
export class UIDocumentParseError extends Error {
	/**
	 * Structured failures suitable for editor and Agent feedback.
	 */
	public readonly diagnostics: readonly UIDiagnostic[];

	public constructor(diagnostics: readonly UIDiagnostic[], cause?: Error) {
		const detail = diagnostics[0]?.message ?? 'Unknown document error.';
		super(`Unable to parse UI document: ${detail}`, { cause });
		this.name = 'UIDocumentParseError';
		this.diagnostics = diagnostics;
	}
}
