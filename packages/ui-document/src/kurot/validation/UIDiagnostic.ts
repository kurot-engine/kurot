/**
 * Stable diagnostic categories emitted by document validation.
 */
export type UIDiagnosticCode =
	| 'duplicate-node-id'
	| 'invalid-document'
	| 'invalid-json'
	| 'invalid-property-value'
	| 'invalid-value'
	| 'unexpected-property'
	| 'unsupported-version';

/**
 * Severity of a document diagnostic.
 */
export type UIDiagnosticSeverity = 'error' | 'warning';

/**
 * Machine-readable validation result with a JSON-style source path.
 */
export interface UIDiagnostic {
	/**
	 * Stable category suitable for programmatic handling.
	 */
	readonly code: UIDiagnosticCode;

	/**
	 * Current validation impact.
	 */
	readonly severity: UIDiagnosticSeverity;

	/**
	 * JSON-style path to the offending value.
	 */
	readonly path: string;

	/**
	 * Human-readable explanation intended for tools and Agent feedback.
	 */
	readonly message: string;
}
