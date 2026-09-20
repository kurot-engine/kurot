/**
 * Stable diagnostic codes emitted by the CLI.
 */
export const DIAGNOSTIC_CODES = {
	KUI_UNKNOWN_TAG: 'KUROT_KUI_UNKNOWN_TAG',
	KUI_COMPILE_FAILED: 'KUROT_KUI_COMPILE_FAILED',
	KUI_DUPLICATE_DEFAULT: 'KUROT_KUI_DUPLICATE_DEFAULT',
	WATCH_RELEASE_IGNORED: 'KUROT_WATCH_RELEASE_IGNORED',
} as const;

/**
 * Union of diagnostic codes currently defined by the CLI.
 */
export type DiagnosticCode = (typeof DIAGNOSTIC_CODES)[keyof typeof DIAGNOSTIC_CODES];

const STRICT_DIAGNOSTIC_CODES: ReadonlySet<DiagnosticCode> = new Set([
	DIAGNOSTIC_CODES.KUI_UNKNOWN_TAG,
]);

/**
 * Returns whether strict mode promotes a diagnostic code to an error.
 */
export function isStrictDiagnosticCode(code: string): boolean {
	return STRICT_DIAGNOSTIC_CODES.has(code as DiagnosticCode);
}
