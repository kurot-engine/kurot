export type AtlasErrorCode = 'invalid-input' | 'invalid-options' | 'atlas-overflow' | 'invalid-png';

/**
 * Stable failure category for tooling; no input files or output files are changed.
 */
export class AtlasError extends Error {
	public readonly code: AtlasErrorCode;

	public constructor(code: AtlasErrorCode, message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = 'AtlasError';
		this.code = code;
	}
}
