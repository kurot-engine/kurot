import type { UIDiagnostic } from '../validation/UIDiagnostic.js';
import { firstDiagnosticMessage } from './first-diagnostic-message.js';

/**
 * Error raised when JSON cannot be decoded as a current-format UI document.
 */
export class UIDocumentParseError extends Error {
	/**
	 * Structured failures suitable for editor and Agent feedback.
	 */
	public readonly diagnostics: readonly UIDiagnostic[];

	public constructor(diagnostics: readonly UIDiagnostic[], cause?: Error) {
		super(`Unable to parse UI document: ${firstDiagnosticMessage(diagnostics)}`, { cause });
		this.name = 'UIDocumentParseError';
		this.diagnostics = diagnostics;
	}
}
