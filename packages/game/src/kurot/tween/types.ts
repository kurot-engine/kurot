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
