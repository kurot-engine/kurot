/**
 * Stable diagnostic categories emitted by document validation.
 */
export type UIDiagnosticCode =
	| 'abstract-component-type'
	| 'circular-component-inheritance'
	| 'duplicate-node-id'
	| 'invalid-component-children'
	| 'invalid-component-property'
	| 'invalid-document'
	| 'invalid-json'
	| 'invalid-property-value'
	| 'invalid-value'
	| 'missing-component-property'
	| 'missing-component-base'
	| 'unexpected-property'
	| 'unknown-component-property'
	| 'unknown-component-type'
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
