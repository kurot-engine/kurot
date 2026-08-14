import { ticker } from '@kurot/core';
import type { EaseFunction, SetStep, TweenOptions, TweenStep } from './types.js';
import { Ease } from './Ease.js';

// ── Global tween registry ───────────────────────────────────────────────────

const _activeTweens = new Set<Tween>();
const _tweenCounts = new WeakMap<object, number>();
let _tickerRegistered = false;
let _globalPaused = false;
let _lastTimeStamp: number | undefined;

// ── Registry helpers ────────────────────────────────────────────────────────

function _getTweenCount(target: object): number {
	return _tweenCounts.get(target) ?? 0;
}

function _incrementTweenCount(target: object): void {
	_tweenCounts.set(target, _getTweenCount(target) + 1);
}

function _decrementTweenCount(target: object): void {
	const count = _getTweenCount(target) - 1;
	if (count <= 0) {
		_tweenCounts.delete(target);
	} else {
		_tweenCounts.set(target, count);
	}
}

// ── Option helpers ──────────────────────────────────────────────────────────

function _normalizeRepeat(repeat: number | undefined, loop: boolean | undefined): number {
	if (repeat === undefined) {
		return loop ? -1 : 0;
	}
	if (repeat === -1) {
		return -1;
	}
	return Number.isFinite(repeat) ? Math.max(0, Math.floor(repeat)) : 0;
}

function _validateDuration(duration: number): number {
	if (!Number.isFinite(duration) || duration < 0) {
		throw new RangeError('Tween duration must be a finite non-negative number.');
	}
	return duration;
}

function _validatePosition(position: number): number {
	if (!Number.isFinite(position)) {
		throw new RangeError('Tween position must be a finite number.');
	}
	return Math.max(0, position);
}

// ── Ticker helpers ──────────────────────────────────────────────────────────

function _registerTicker(): void {
	if (_tickerRegistered) {
		return;
	}
	_tickerRegistered = true;
	ticker.startTick(_globalTick, null);
}

function _unregisterTicker(): void {
	if (!_tickerRegistered) {
		return;
	}
	_tickerRegistered = false;
	_lastTimeStamp = undefined;
	ticker.stopTick(_globalTick, null);
}

function _globalTick(timeStamp: number): boolean {
	if (_lastTimeStamp === undefined) {
		_lastTimeStamp = timeStamp;
		return false;
	}

	const deltaTime = timeStamp - _lastTimeStamp;
	_lastTimeStamp = timeStamp;
	for (const tween of [..._activeTweens]) {
		tween._tick(deltaTime);
	}
	return false;
}

// ── Lifecycle helpers ───────────────────────────────────────────────────────

function _addActive(tween: Tween): void {
	if (_activeTweens.size === 0) {
		_registerTicker();
	}
	_activeTweens.add(tween);
}

function _removeActive(tween: Tween): void {
	if (!_activeTweens.delete(tween) || _activeTweens.size !== 0) {
		return;
	}
	_unregisterTicker();
}

function _releaseTween(tween: Tween): void {
	const target = tween._target;
	if (!target) {
		return;
	}

	tween._target = undefined;
	_decrementTweenCount(target);
	_removeActive(tween);
	tween._resolveAll();
	tween._notifyRelease();
	tween._dispose();
}

/**
 * Property animation sequence with repeat, yoyo, and thenable completion.
 *
 * @example
 * ```ts
 * await Tween.get(sprite)
 * 	.to({ x: 200, alpha: 0 }, 300, Ease.cubicOut)
 * 	.wait(100);
 * ```
 */
export class Tween {
	// ── Static methods ────────────────────────────────────────────────────────

	/**
	 * Creates a Tween for a target.
	 */
	public static get(target: object, options?: TweenOptions, override = false): Tween {
		if (override) {
			Tween.removeTweens(target);
		}

		const tween = new Tween();
		tween._initialize(target, options);
		_addActive(tween);
		_incrementTweenCount(target);
		return tween;
	}

	/**
	 * Returns the number of active or paused tweens targeting an object.
	 */
	public static getCount(target: object): number {
		return _getTweenCount(target);
	}

	/**
	 * Removes every tween targeting an object.
	 */
	public static removeTweens(target: object): void {
		for (const tween of [..._activeTweens]) {
			if (tween._target === target) {
				_releaseTween(tween);
			}
		}
	}

	/**
	 * Pauses every tween targeting an object.
	 */
	public static pauseTweens(target: object): void {
		for (const tween of _activeTweens) {
			if (tween._target === target) {
				tween.setPaused(true);
			}
		}
	}

	/**
	 * Resumes every tween targeting an object.
	 */
	public static resumeTweens(target: object): void {
		for (const tween of _activeTweens) {
			if (tween._target === target) {
				tween.setPaused(false);
			}
		}
	}

	/**
	 * Removes every active tween.
	 */
	public static removeAllTweens(): void {
		for (const tween of [..._activeTweens]) {
			_releaseTween(tween);
		}
	}

	/**
	 * Pauses all tweens except those configured to ignore global pause.
	 */
	public static pauseAll(): void {
		_globalPaused = true;
	}

	/**
	 * Resumes globally paused tweens.
	 */
	public static resumeAll(): void {
		_globalPaused = false;
	}

	// ── Instance fields ───────────────────────────────────────────────────────

	_target?: object;
	private _steps: TweenStep[] = [];
	private _stepIndex = 0;
	private _stepElapsed = 0;
	private _hasTimedSteps = false;
	private _pendingPosition?: number;
	private _paused = false;
	private _repeatsLeft = 0;
	private _yoyo = false;
	private _reversed = false;
	private _ignoreGlobalPause = false;
	private _defaultEase: EaseFunction = Ease.linear;
	private _onChange?: (tween: Tween) => void;
	private _onChangeObj?: object;
	private _onLoopComplete?: (tween: Tween) => void;
	private _onLoopCompleteObj?: object;
	private _resolvers: Array<() => void> = [];
	private _releaseListeners: Array<() => void> = [];
	private _isCompleted = false;

	// ── Getters / Setters ─────────────────────────────────────────────────────

	/**
	 * Whether the tween has not yet completed or been removed.
	 */
	public get isActive(): boolean {
		return this._target !== undefined;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Resolves with `undefined` when the tween completes or is removed.
	 * Completion never rejects; cancellation and natural completion share the
	 * same terminal state.
	 */
	public then<TResult1 = void, TResult2 = never>(
		onfulfilled?: ((value: void) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
	): PromiseLike<TResult1 | TResult2> {
		return new Promise<void>(resolve => {
			if (this._isCompleted) {
				resolve();
			} else {
				this._resolvers.push(resolve);
			}
		}).then(onfulfilled, onrejected);
	}

	/**
	 * Adds a property interpolation step. Start values are sampled on first use
	 * and then retained, keeping repeat and yoyo cycles continuous.
	 */
	public to(props: Record<string, number>, duration: number, ease?: EaseFunction): this {
		const stepDuration = _validateDuration(duration);
		this._steps.push({ type: 'to', props, duration: stepDuration, ease: ease ?? this._defaultEase });
		this._hasTimedSteps ||= stepDuration > 0;
		return this;
	}

	/**
	 * Adds an interpolation from explicit values to the target's initial values.
	 * The original end values are captured once and reused by later cycles.
	 */
	public from(props: Record<string, number>, duration: number, ease?: EaseFunction): this {
		const stepDuration = _validateDuration(duration);
		this._steps.push({ type: 'from', props, duration: stepDuration, ease: ease ?? this._defaultEase });
		this._hasTimedSteps ||= stepDuration > 0;
		return this;
	}

	/**
	 * Adds a delay to the sequence.
	 */
	public wait(duration: number): this {
		const stepDuration = _validateDuration(duration);
		if (stepDuration === 0) {
			return this;
		}
		this._steps.push({ type: 'wait', duration: stepDuration });
		this._hasTimedSteps = true;
		return this;
	}

	/**
	 * Adds a callback step.
	 */
	public call(callback: (...args: unknown[]) => void, thisObj?: object, params?: unknown[]): this {
		this._steps.push({ type: 'call', duration: 0, fn: callback, thisObj, params: params ?? [] });
		return this;
	}

	/**
	 * Adds an immediate property update.
	 */
	public set(props: Record<string, unknown>): this {
		this._steps.push({ type: 'set', duration: 0, props });
		return this;
	}

	/**
	 * Pauses or resumes the tween.
	 */
	public setPaused(value: boolean): this {
		this._paused = value;
		return this;
	}

	/**
	 * Pauses the tween.
	 */
	public pause(): void {
		this.setPaused(true);
	}

	/**
	 * Resumes the tween.
	 */
	public resume(): void {
		this.setPaused(false);
	}

	/**
	 * Removes the tween.
	 */
	public remove(): void {
		_releaseTween(this);
	}

	/**
	 * Moves the sequence to an absolute position in its initial forward pass.
	 * Seeking applies prior interpolations and `set` steps, but deliberately
	 * skips `call` steps to avoid replaying arbitrary side effects.
	 */
	public setPosition(value: number): void {
		if (!this._target) {
			return;
		}
		this._pendingPosition = undefined;
		this._seekTo(_validatePosition(value));
		if (this._stepIndex >= this._steps.length) {
			_releaseTween(this);
		}
	}

	// ── Internal methods ──────────────────────────────────────────────────────

	public _addReleaseListener(listener: () => void): void {
		if (this._isCompleted) {
			listener();
			return;
		}
		this._releaseListeners.push(listener);
	}

	public _tick(deltaTime: number): void {
		if (this._paused || (!this._ignoreGlobalPause && _globalPaused) || !this._target) {
			return;
		}

		if (this._pendingPosition !== undefined) {
			const position = this._pendingPosition;
			this._pendingPosition = undefined;
			this._seekTo(position);
		}
		if (this._stepIndex >= this._steps.length) {
			_releaseTween(this);
			return;
		}

		let remaining = Math.max(0, deltaTime);
		do {
			while (remaining > 0 && this._stepIndex < this._steps.length) {
				const step = this._steps[this._canonicalStepIndex(this._stepIndex)];
				if (step.duration === 0) {
					this._advanceInstantSteps();
					continue;
				}

				if (this._stepElapsed === 0) {
					this._initializeStep(step);
				}
				this._stepElapsed += remaining;
				if (this._stepElapsed >= step.duration) {
					remaining = this._stepElapsed - step.duration;
					this._stepElapsed = 0;
					this._applyStep(step, this._reversed ? 0 : 1);
					this._stepIndex++;
				} else {
					this._applyStep(
						step,
						this._reversed ? 1 - this._stepElapsed / step.duration : this._stepElapsed / step.duration,
					);
					remaining = 0;
				}
			}

			this._advanceInstantSteps();
			if (this._stepIndex < this._steps.length) {
				break;
			}
			if (this._repeatsLeft === 0) {
				this._notifyChange();
				if (!this._target) {
					return;
				}
				_releaseTween(this);
				return;
			}

			this._startNextCycle();
			if (!this._target) {
				return;
			}
			if (!this._hasTimedSteps && this._repeatsLeft === -1) {
				break;
			}
		} while (remaining > 0 || (!this._hasTimedSteps && this._repeatsLeft !== -1));

		this._notifyChange();
	}

	public _notifyRelease(): void {
		const listeners = this._releaseListeners;
		this._releaseListeners = [];
		for (const listener of listeners) {
			listener();
		}
	}

	public _resolveAll(): void {
		this._isCompleted = true;
		const resolvers = this._resolvers;
		this._resolvers = [];
		for (const resolve of resolvers) {
			resolve();
		}
	}

	public _dispose(): void {
		this._steps = [];
		this._stepIndex = 0;
		this._stepElapsed = 0;
		this._hasTimedSteps = false;
		this._pendingPosition = undefined;
		this._onChange = undefined;
		this._onChangeObj = undefined;
		this._onLoopComplete = undefined;
		this._onLoopCompleteObj = undefined;
		this._releaseListeners = [];
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private _initialize(target: object, options?: TweenOptions): void {
		this._target = target;
		this._steps = [];
		this._stepIndex = 0;
		this._stepElapsed = 0;
		this._hasTimedSteps = false;
		this._pendingPosition = options?.position === undefined ? undefined : _validatePosition(options.position);
		this._paused = options?.paused ?? false;
		this._repeatsLeft = _normalizeRepeat(options?.repeat, options?.loop);
		this._yoyo = options?.yoyo ?? false;
		this._reversed = false;
		this._ignoreGlobalPause = options?.ignoreGlobalPause ?? false;
		this._defaultEase = options?.ease ?? Ease.linear;
		this._onChange = options?.onChange;
		this._onChangeObj = options?.onChangeObj;
		this._onLoopComplete = options?.onLoopComplete;
		this._onLoopCompleteObj = options?.onLoopCompleteObj;
	}

	private _advanceInstantSteps(): void {
		while (this._stepIndex < this._steps.length) {
			const step = this._steps[this._canonicalStepIndex(this._stepIndex)];
			if (step.duration !== 0) {
				return;
			}
			if (step.type === 'to' || step.type === 'from') {
				this._initializeStep(step);
				this._applyStep(step, this._reversed ? 0 : 1);
			} else if (!this._reversed) {
				this._executeInstantStep(step);
			}
			this._stepIndex++;
		}
	}

	private _startNextCycle(): void {
		if (this._repeatsLeft > 0) {
			this._repeatsLeft--;
		}
		this._stepIndex = 0;
		this._stepElapsed = 0;
		this._reversed = this._yoyo ? !this._reversed : false;
		if (this._onLoopComplete) {
			this._onLoopComplete.call(this._onLoopCompleteObj ?? this._target, this);
		}
	}

	private _initializeStep(step: TweenStep): void {
		if (step.type === 'to' && step.startValues) {
			return;
		}
		if (step.type === 'from' && step.endValues) {
			return;
		}

		const target = this._target as Record<string, unknown>;
		if (step.type === 'to') {
			step.startValues = {};
			for (const key of Object.keys(step.props)) {
				step.startValues[key] = (target[key] as number) ?? 0;
			}
		} else if (step.type === 'from') {
			step.endValues = {};
			for (const key of Object.keys(step.props)) {
				step.endValues[key] = (target[key] as number) ?? 0;
				target[key] = step.props[key];
			}
		}
	}

	private _canonicalStepIndex(index: number): number {
		return this._reversed ? this._steps.length - 1 - index : index;
	}

	private _applyStep(step: TweenStep, progress: number): void {
		const target = this._target as Record<string, unknown>;
		if (step.type === 'to') {
			const easedProgress = step.ease(progress);
			const start = step.startValues!;
			for (const key of Object.keys(step.props)) {
				target[key] = start[key] + (step.props[key] - start[key]) * easedProgress;
			}
		} else if (step.type === 'from') {
			const easedProgress = step.ease(progress);
			const end = step.endValues!;
			for (const key of Object.keys(step.props)) {
				target[key] = step.props[key] + (end[key] - step.props[key]) * easedProgress;
			}
		}
	}

	private _executeInstantStep(step: TweenStep): void {
		if (step.type === 'call') {
			step.fn.apply(step.thisObj ?? this._target, step.params);
		} else if (step.type === 'set') {
			this._applySetStep(step);
		}
	}

	private _applySetStep(step: SetStep): void {
		const target = this._target as Record<string, unknown>;
		for (const key of Object.keys(step.props)) {
			target[key] = step.props[key];
		}
	}

	private _seekTo(position: number): void {
		this._stepIndex = 0;
		this._stepElapsed = 0;
		this._reversed = false;
		let remaining = position;

		while (this._stepIndex < this._steps.length) {
			const step = this._steps[this._stepIndex];
			if (step.duration === 0) {
				if (step.type === 'to' || step.type === 'from') {
					this._initializeStep(step);
					this._applyStep(step, 1);
				} else if (step.type === 'set') {
					this._applySetStep(step);
				}
				this._stepIndex++;
				continue;
			}

			this._initializeStep(step);
			if (remaining >= step.duration) {
				this._applyStep(step, 1);
				remaining -= step.duration;
				this._stepIndex++;
				continue;
			}

			this._stepElapsed = remaining;
			this._applyStep(step, remaining / step.duration);
			return;
		}
	}

	private _notifyChange(): void {
		if (this._onChange) {
			this._onChange.call(this._onChangeObj ?? this._target, this);
		}
	}
}
