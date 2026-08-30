import type { UIDiagnostic } from '../validation/UIDiagnostic.js';
import { firstDiagnosticMessage } from './first-diagnostic-message.js';

/**
 * Error raised when an in-memory document cannot be safely serialized.
 */
export class UIDocumentValidationError extends Error {
	/**
	 * Structured failures suitable for editor and Agent feedback.
	 */
	public readonly diagnostics: readonly UIDiagnostic[];

	public constructor(diagnostics: readonly UIDiagnostic[]) {
		super(`Unable to serialize UI document: ${firstDiagnosticMessage(diagnostics)}`);
		this.name = 'UIDocumentValidationError';
		this.diagnostics = diagnostics;
	}
}
