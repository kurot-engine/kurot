/**
 * Severity assigned to a build diagnostic.
 */
export type DiagnosticSeverity = 'warning' | 'error';

/**
 * Source position associated with a diagnostic.
 */
export interface SourceLocation {
	readonly file: string;
	readonly line?: number;
	readonly column?: number;
	readonly offset?: number;
}

/**
 * Serializable issue reported while processing a project.
 */
export interface Diagnostic {
	readonly code: string;
	readonly severity: DiagnosticSeverity;
	readonly message: string;
	readonly location?: SourceLocation;
	readonly suggestions?: readonly string[];
}

/**
 * Policy controlling how diagnostics are classified.
 */
export interface DiagnosticPolicy {
	readonly strict: boolean;
}
