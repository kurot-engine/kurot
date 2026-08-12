import { EventEmitter } from './EventEmitter.js';

// Forward declaration — filled in once SkeletonAnimation is implemented
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SkeletonAnimationRef = any;

/**
 * Animation event types dispatched by a Track.
 */
export const enum SpineEvent {
	PlayStart,
	PlayEnd,
	LoopStart,
	LoopEnd,
	Interrupt,
	Custom,
	TrackEnd,
}

/**
 * Per-animation lifecycle callbacks, passed to `Track.add()`.
 */
export interface AnimationListener {
	playStart?: () => void;
	playEnd?: () => void;
	loopStart?: () => void;
	loopEnd?: () => void;
	interrupt?: () => void;
	custom?: (event: unknown) => void;
}

interface AnimationRecord {
	name: string;
	loop: number;
	listener?: AnimationListener;
}

/**
 * Manages a queue of animations on a single Spine track.
 *
 * Animations are played sequentially. Each entry can specify a loop count
 * and lifecycle callbacks. Promise-based helpers allow `await`-ing events.
 *
 * @example
 * ```ts
 * const track = hero.start(0);
 * track.add('idle', 0);           // loop forever
 * track.add('attack', 1);         // play once, then continue queue
 * await track.waitPlayEnd();
 * ```
 */
export class Track extends EventEmitter<SpineEvent> {
	// ── Instance fields ───────────────────────────────────────────────────────

	public readonly trackID: number;
	public readonly skelAnimation: SkeletonAnimationRef;
	public trackEntry: unknown;

	private _animations: AnimationRecord[] = [];
	private _disposed = false;
	private _loop = 0;
	private _stateListener: unknown;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(skelAnimation: SkeletonAnimationRef, trackID: number) {
		super();
		this.trackID = trackID;
		this.skelAnimation = skelAnimation;
		this._stateListener = {
			complete: () => this._onComplete(),
			interrupt: () => this._onInterrupt(),
			event: (_: unknown, event: unknown) => this._onCustomEvent(event),
			start: undefined,
			end: undefined,
			dispose: undefined,
		};
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Add an animation to the queue.
	 * @param name Animation name as defined in the Spine editor.
	 * @param loop Number of times to play. 0 = loop forever.
	 * @param listener Optional lifecycle callbacks for this animation.
	 */
	public add(name: string, loop = 1, listener?: AnimationListener): this {
		if (!this._disposed && this._animations) {
			this._animations.push({ name, loop, listener });
			if (this._animations.length === 1) {
				this._playNext();
			}
		}
		return this;
	}

	/**
	 * Jump the track entry to its last frame.
	 */
	public setToLastFrame(): void {
		const entry = this.trackEntry as Record<string, number> | undefined;
		if (entry) {
			entry['animationStart'] = entry['animationLast'] = entry['animationEnd'];
		}
	}

	// ── Promise helpers ───────────────────────────────────────────────────────

	/**
	 * Resolves when the current animation's first loop begins.
	 */
	public waitPlayStart(): Promise<void> {
		return new Promise(resolve => this.once(SpineEvent.PlayStart, resolve as () => void));
	}

	/**
	 * Resolves when the current animation finishes all its loops.
	 */
	public waitPlayEnd(): Promise<void> {
		return new Promise(resolve => this.once(SpineEvent.PlayEnd, resolve as () => void));
	}

	/**
	 * Resolves at the start of each loop iteration.
	 */
	public waitLoopStart(): Promise<void> {
		return new Promise(resolve => this.once(SpineEvent.LoopStart, resolve as () => void));
	}

	/**
	 * Resolves at the end of each loop iteration.
	 */
	public waitLoopEnd(): Promise<void> {
		return new Promise(resolve => this.once(SpineEvent.LoopEnd, resolve as () => void));
	}

	/**
	 * Resolves when the track is interrupted by another animation.
	 */
	public waitInterrupt(): Promise<void> {
		return new Promise(resolve => this.once(SpineEvent.Interrupt, resolve as () => void));
	}

	/**
	 * Resolves when the entire animation queue is exhausted.
	 */
	public waitTrackEnd(): Promise<void> {
		return new Promise(resolve => this.once(SpineEvent.TrackEnd, resolve as () => void));
	}

	/**
	 * Resolves on the next Spine frame event.
	 */
	public waitEvent(): Promise<unknown> {
		return new Promise(resolve => this.once(SpineEvent.Custom, resolve as () => void));
	}

	/**
	 * Resolves when a Spine frame event with the given name fires.
	 */
	public waitNamedEvent(name: string): Promise<unknown> {
		return new Promise(resolve => {
			const callback = (event: unknown): void => {
				const e = event as { data?: { name?: string } };
				if (e?.data?.name === name) {
					this.off(SpineEvent.Custom, callback);
					resolve(event);
				}
			};
			this.on(SpineEvent.Custom, callback);
		});
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private _playNext(): void {
		if (this._disposed || this._animations.length === 0) return;

		const { name, listener } = this._animations[0];

		if (listener) {
			if (listener.playStart) this.on(SpineEvent.PlayStart, listener.playStart, listener);
			if (listener.playEnd) this.on(SpineEvent.PlayEnd, listener.playEnd, listener);
			if (listener.loopStart) this.on(SpineEvent.LoopStart, listener.loopStart, listener);
			if (listener.loopEnd) this.on(SpineEvent.LoopEnd, listener.loopEnd, listener);
			if (listener.interrupt) this.on(SpineEvent.Interrupt, listener.interrupt, listener);
			if (listener.custom) this.on(SpineEvent.Custom, listener.custom as (...args: unknown[]) => void, listener);
		}

		this._loop = 0;
		this._setAnimation(name, false);
		this.emit(SpineEvent.PlayStart);
		this.emit(SpineEvent.LoopStart);
	}

	private _setAnimation(name: string, loop: boolean): void {
		const entry = this.trackEntry as Record<string, unknown> | undefined;
		if (entry) {
			entry['listener'] = undefined;
		}
		this.trackEntry = this.skelAnimation.state.setAnimation(this.trackID, name, loop);
		const newEntry = this.trackEntry as Record<string, unknown>;
		newEntry['listener'] = this._stateListener;
		this.skelAnimation.renderer.update(0);
	}

	private _onComplete(): void {
		if (this._disposed) return;

		const animation = this._animations[0];
		this.emit(SpineEvent.LoopEnd);

		if (++this._loop !== animation.loop) {
			this._setAnimation(animation.name, false);
			this.emit(SpineEvent.LoopStart);
		} else {
			const { listener } = animation;
			this.emit(SpineEvent.PlayEnd);
			this._animations.shift();

			if (listener) {
				this.off(SpineEvent.PlayStart, listener.playStart as (...args: unknown[]) => void);
				this.off(SpineEvent.PlayEnd, listener.playEnd as (...args: unknown[]) => void);
				this.off(SpineEvent.LoopStart, listener.loopStart as (...args: unknown[]) => void);
				this.off(SpineEvent.LoopEnd, listener.loopEnd as (...args: unknown[]) => void);
				this.off(SpineEvent.Interrupt, listener.interrupt as (...args: unknown[]) => void);
				this.off(SpineEvent.Custom, listener.custom as (...args: unknown[]) => void);
			}

			if (this._animations.length > 0) {
				this._playNext();
			} else {
				const entry = this.trackEntry as Record<string, unknown> | undefined;
				if (entry) entry['listener'] = undefined;
				this.trackEntry = undefined;
				this._disposed = true;
				this.emit(SpineEvent.TrackEnd);
			}
		}
	}

	private _onInterrupt(): void {
		if (this._disposed) return;
		this._disposed = true;
		this._animations.length = 0;
		this.emit(SpineEvent.Interrupt);
	}

	private _onCustomEvent(event: unknown): void {
		if (!this._disposed) {
			this.emit(SpineEvent.Custom, event);
		}
	}
}
