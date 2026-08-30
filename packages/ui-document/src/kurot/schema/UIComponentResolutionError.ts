/**
 * Stable failure categories produced while resolving component inheritance.
 */
export type UIComponentResolutionErrorCode =
	| 'circular-component-inheritance'
	| 'missing-component-base';

/**
 * Error raised when registered component definitions cannot be resolved.
 */
export class UIComponentResolutionError extends Error {
	/**
	 * Stable category suitable for diagnostics and Agent feedback.
	 */
	public readonly code: UIComponentResolutionErrorCode;

	/**
	 * Resolution chain ending at the failing or repeated type.
	 */
	public readonly chain: readonly string[];

	public constructor(
		code: UIComponentResolutionErrorCode,
		message: string,
		chain: readonly string[],
	) {
		super(message);
		this.name = 'UIComponentResolutionError';
		this.code = code;
		this.chain = Object.freeze([...chain]);
	}
}
