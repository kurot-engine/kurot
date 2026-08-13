/**
 * Stable diagnostic codes emitted by the CLI.
 */
export const DIAGNOSTIC_CODES = {
	EXML_UNKNOWN_TAG: 'KUROT_EXML_UNKNOWN_TAG',
	EXML_COMPILE_FAILED: 'KUROT_EXML_COMPILE_FAILED',
	EXML_DECLARED_FILE_NOT_FOUND: 'KUROT_EXML_DECLARED_FILE_NOT_FOUND',
	THEME_FILE_NOT_FOUND: 'KUROT_THEME_FILE_NOT_FOUND',
	THEME_INVALID_JSON: 'KUROT_THEME_INVALID_JSON',
	THEME_SKIN_NOT_FOUND: 'KUROT_THEME_SKIN_NOT_FOUND',
} as const;

/**
 * Union of diagnostic codes currently defined by the CLI.
 */
export type DiagnosticCode = (typeof DIAGNOSTIC_CODES)[keyof typeof DIAGNOSTIC_CODES];

const STRICT_DIAGNOSTIC_CODES: ReadonlySet<DiagnosticCode> = new Set([
	DIAGNOSTIC_CODES.EXML_UNKNOWN_TAG,
	DIAGNOSTIC_CODES.EXML_DECLARED_FILE_NOT_FOUND,
	DIAGNOSTIC_CODES.THEME_FILE_NOT_FOUND,
	DIAGNOSTIC_CODES.THEME_SKIN_NOT_FOUND,
]);

/**
 * Returns whether strict mode promotes a diagnostic code to an error.
 */
export function isStrictDiagnosticCode(code: string): boolean {
	return STRICT_DIAGNOSTIC_CODES.has(code as DiagnosticCode);
}
