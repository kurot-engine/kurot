import type { Tween } from './Tween.js';

/**
 * Maps normalized progress in the range [0, 1] to eased progress.
 */
export type EaseFunction = (t: number) => number;

/** @internal Discriminant used by the runtime step queue. */
export type StepType = 'to' | 'from' | 'wait' | 'call' | 'set';

/** @internal Fields shared by every queued tween step. */
export interface BaseStep {
	type: StepType;
	duration: number;
}

/** @internal Interpolates from captured target values to `props`. */
export interface ToStep extends BaseStep {
	type: 'to';
	props: Record<string, number>;
	ease: EaseFunction;
	/** Captured once to preserve repeat and yoyo endpoints. */
	startValues?: Record<string, number>;
}

/** @internal Interpolates from `props` to captured target values. */
export interface FromStep extends BaseStep {
	type: 'from';
	props: Record<string, number>;
	ease: EaseFunction;
	/** Captured once before the source values are applied. */
	endValues?: Record<string, number>;
}

/** @internal Advances time without mutating target properties. */
export interface WaitStep extends BaseStep {
	type: 'wait';
}

/** @internal Runs a user callback during forward playback only. */
export interface CallStep extends BaseStep {
	type: 'call';
	fn: (...args: unknown[]) => void;
	thisObj?: object;
	params: unknown[];
}

/** @internal Assigns properties immediately during forward playback only. */
export interface SetStep extends BaseStep {
	type: 'set';
	props: Record<string, unknown>;
}

/** @internal Complete union of runtime step variants. */
export type TweenStep = ToStep | FromStep | WaitStep | CallStep | SetStep;

/**
 * Configures a Tween created by `Tween.get()`.
 */
export interface TweenOptions {
	/**
	 * Repeats indefinitely when `repeat` is not set.
	 */
	loop?: boolean;
	/**
	 * Number of additional playback cycles; `-1` repeats indefinitely.
	 */
	repeat?: number;
	/**
	 * Alternates playback direction between cycles.
	 */
	yoyo?: boolean;
	/**
	 * Allows the tween to advance while all tweens are globally paused.
	 */
	ignoreGlobalPause?: boolean;
	/**
	 * Default easing function for property steps.
	 */
	ease?: EaseFunction;
	/**
	 * Starts the tween in a paused state.
	 */
	paused?: boolean;
	/**
	 * Applies this forward-sequence position on the first active tick.
	 */
	position?: number;
	/**
	 * Runs after each tween update, including the final update.
	 */
	onChange?: (tween: Tween) => void;
	/**
	 * Provides the `this` value for `onChange`.
	 */
	onChangeObj?: object;
	/**
	 * Runs after each completed cycle that will repeat.
	 */
	onLoopComplete?: (tween: Tween) => void;
	/**
	 * Provides the `this` value for `onLoopComplete`.
	 */
	onLoopCompleteObj?: object;
}
