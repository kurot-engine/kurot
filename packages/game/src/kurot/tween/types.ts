import type { Tween } from './Tween.js';

/**
 * Maps normalized progress in the range [0, 1] to eased progress.
 */
export type EaseFunction = (t: number) => number;

export type StepType = 'to' | 'from' | 'wait' | 'call' | 'set';

export interface BaseStep {
	type: StepType;
	duration: number;
}

export interface ToStep extends BaseStep {
	type: 'to';
	props: Record<string, number>;
	ease: EaseFunction;
	startValues?: Record<string, number>;
}

export interface FromStep extends BaseStep {
	type: 'from';
	props: Record<string, number>;
	ease: EaseFunction;
	endValues?: Record<string, number>;
}

export interface WaitStep extends BaseStep {
	type: 'wait';
}

export interface CallStep extends BaseStep {
	type: 'call';
	fn: (...args: unknown[]) => void;
	thisObj?: object;
	params: unknown[];
}

export interface SetStep extends BaseStep {
	type: 'set';
	props: Record<string, unknown>;
}

export type TweenStep = ToStep | FromStep | WaitStep | CallStep | SetStep;

/**
 * Configures a Tween created by `Tween.get()`.
 */
export interface TweenOptions {
	/**
	 * Whether to repeat indefinitely when repeat is omitted; defaults to false.
	 * An explicit repeat value takes precedence. Remove infinite tweens when their
	 * owning game round ends; removing a display object does not remove its tweens.
	 */
	loop?: boolean;
	/**
	 * Additional cycles after the first; defaults to 0, or -1 when loop is true.
	 * Exactly -1 repeats forever. Other finite values are floored and clamped to 0;
	 * non-finite values become 0. Counts are cycles, not milliseconds.
	 */
	repeat?: number;
	/**
	 * Whether successive cycles alternate direction; defaults to false.
	 * This changes repeat direction but does not itself enable repetition.
	 */
	yoyo?: boolean;
	/**
	 * Whether to advance during Tween.pauseAll(); defaults to false.
	 * An individually paused tween still stays paused.
	 */
	ignoreGlobalPause?: boolean;
	/**
	 * Default easing for to/from steps; defaults to Ease.linear.
	 * Receives normalized progress, independent of the millisecond step duration.
	 */
	ease?: EaseFunction;
	/**
	 * Whether to register the tween in a paused state; defaults to false.
	 * Paused tweens remain active and retain their target until removed or completed.
	 */
	paused?: boolean;
	/**
	 * Initial forward-sequence position in milliseconds; omitted means 0.
	 * Applied on the first active update, rather than synchronously at construction.
	 * Negative values clamp to 0; non-finite values throw RangeError.
	 */
	position?: number;
	/**
	 * Optional callback after each tween update, including the final update.
	 * Called synchronously with the Tween argument; exceptions propagate to the caller
	 * or ticker. Stop/remove the tween to end future callbacks during game disposal.
	 */
	onChange?: (tween: Tween) => void;
	/**
	 * Callback receiver for onChange; defaults to the tween target when omitted.
	 */
	onChangeObj?: object;
	/**
	 * Optional synchronous callback after a cycle that will repeat, before the
	 * next cycle. It does not run for the final finite cycle. Exceptions propagate.
	 */
	onLoopComplete?: (tween: Tween) => void;
	/**
	 * Callback receiver for onLoopComplete; defaults to the tween target when omitted.
	 */
	onLoopCompleteObj?: object;
}
