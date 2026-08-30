import type { UIDiagnostic } from '../validation/UIDiagnostic.js';

/**
 * Stable editing-kernel failure categories.
 */
export type UIEditErrorCode =
	| 'duplicate-node-id'
	| 'index-out-of-range'
	| 'invalid-edit-result'
	| 'invalid-operation'
	| 'invalid-parent'
	| 'missing-instance'
	| 'node-not-found'
	| 'revision-conflict'
	| 'root-operation'
	| 'transaction-empty';

/**
 * Structured failure raised before an invalid edit can commit.
 */
export class UIEditError extends Error {
	/**
	 * Stable machine-readable failure category.
	 */
	public readonly code: UIEditErrorCode;

	/**
	 * Operation or document path responsible for the failure.
	 */
	public readonly path: string;

	/**
	 * Validation diagnostics produced by a rejected final snapshot.
	 */
	public readonly diagnostics: readonly UIDiagnostic[];

	public constructor(
		code: UIEditErrorCode,
		message: string,
		path: string,
		diagnostics: readonly UIDiagnostic[] = [],
	) {
		super(message);
		this.name = 'UIEditError';
		this.code = code;
		this.path = path;
		this.diagnostics = diagnostics;
	}
}
