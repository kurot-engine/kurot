/**
 * Stable diagnostic categories emitted by document validation.
 */
export type UIDiagnosticCode =
	| 'abstract-component-type'
	| 'circular-ui-asset-dependency'
	| 'circular-component-inheritance'
	| 'duplicate-component-type'
	| 'duplicate-node-id'
	| 'duplicate-ui-asset-id'
	| 'invalid-asset-contract'
	| 'invalid-asset-kind'
	| 'invalid-asset-reference'
	| 'invalid-component-children'
	| 'invalid-component-instance'
	| 'invalid-component-property'
	| 'invalid-component-source'
	| 'invalid-document'
	| 'invalid-json'
	| 'invalid-property-value'
	| 'invalid-resource-reference'
	| 'invalid-token-reference'
	| 'invalid-slot-content'
	| 'invalid-value'
	| 'missing-component-property'
	| 'missing-component-base'
	| 'missing-instance-parameter'
	| 'missing-slot-content'
	| 'resource-type-mismatch'
	| 'token-type-mismatch'
	| 'unexpected-property'
	| 'unknown-node-reference'
	| 'unknown-component-property'
	| 'unknown-component-type'
	| 'unknown-instance-parameter'
	| 'unknown-part'
	| 'unknown-resource'
	| 'unknown-slot'
	| 'unknown-token'
	| 'unknown-ui-asset'
	| 'unknown-variant'
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
