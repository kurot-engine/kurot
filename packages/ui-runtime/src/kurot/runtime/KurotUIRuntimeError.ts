import type { UIDiagnostic } from '@kurot/ui-document';
import type { KurotUIRuntimeErrorCode } from './types.js';

/**
 * Structured failure raised while validating or materializing a UI document.
 */
export class KurotUIRuntimeError extends Error {
	// ── Instance fields ───────────────────────────────────────────────────

	/**
	 * Stable category suitable for programmatic error handling.
	 */
	public readonly code: KurotUIRuntimeErrorCode;

	/**
	 * Exact semantic document path at which materialization failed.
	 */
	public readonly path: string;

	/**
	 * Structural or component diagnostics produced before materialization.
	 */
	public readonly diagnostics: readonly UIDiagnostic[];

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(
		code: KurotUIRuntimeErrorCode,
		message: string,
		path = '$',
		diagnostics: readonly UIDiagnostic[] = [],
	) {
		super(message);
		this.name = 'KurotUIRuntimeError';
		this.code = code;
		this.path = path;
		this.diagnostics = diagnostics;
	}
}
