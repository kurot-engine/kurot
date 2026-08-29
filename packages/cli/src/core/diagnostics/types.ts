/**
 * Severity assigned to a build diagnostic.
 */
export type DiagnosticSeverity = 'warning' | 'error';

/**
 * Source position associated with a diagnostic.
 */
export interface SourceLocation {
	/**
	 * Project-relative source path when available.
	 */
	readonly file: string;
	/**
	 * One-based source line.
	 */
	readonly line?: number;
	/**
	 * One-based UTF-16 source column.
	 */
	readonly column?: number;
	/**
	 * Zero-based UTF-16 source offset.
	 */
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
	/**
	 * Whether supported warning codes are promoted to errors.
	 */
	readonly strict: boolean;
}
