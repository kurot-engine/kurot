import { Event } from '../events/Event.js';
import { DisplayObject } from '../display/DisplayObject.js';
import type { Stage } from '../display/Stage.js';
import { LogicClock } from './LogicClock.js';
import { TickerScheduler } from './TickerScheduler.js';

/**
 * Project-selected lifecycle policy. Pause is the compatible default; continue
 * advances fixed logical frames while suppressing hidden presentation.
 */
export type BackgroundPolicy = 'pause' | 'continue';

/**
 * Browser lifecycle policy, selected before registering game clocks or starting.
 */
export interface LifecycleOptions {
	/**
	 * Default pause keeps legacy scheduling. Continue uses fixed logical frames,
	 * suppresses hidden rendering and catches up elapsed time after suspension.
	 */
	backgroundPolicy?: BackgroundPolicy;
}

export const START_TIME: number = Date.now();

export let invalidateRenderFlag = false;
export function setInvalidateRenderFlag(value: boolean): void {
	invalidateRenderFlag = value;
}

export let requestRenderingFlag = false;
export function setRequestRenderingFlag(value: boolean): void {
	requestRenderingFlag = value;
}

type TickCallback = (timeStamp: number) => boolean;

/**
 * Render callback — called by SystemTicker each frame to render a player.
 */
export interface Renderable {
	render(triggerByFrame: boolean, costTicker: number): void;
}

/**
 * Runs frame throttling, tick callbacks, player rendering and deferred calls.
 */
export class SystemTicker {
	// ── Instance fields ───────────────────────────────────────────────────────

	private _players: Renderable[] = [];
	private _ticks: TickCallback[] = [];
	private _frameRate = 30;
	private _frameDeltaTime: number;
	private _frameInterval: number;
	private _lastCount: number;
	private _lastTimeStamp = 0;
	private _costEnterFrame = 0;
	private _isPaused = false;
	private _pageHidden = false;
	private _backgroundPolicy: BackgroundPolicy = 'pause';
	private _clock?: LogicClock;
	private _updating = false;
	private _generation = 0;
	private readonly _scheduler = new TickerScheduler(() => {
		if (!this._running) {
			return;
		}
		try {
			this.update();
		} finally {
			this.schedule();
		}
	});
	private _running = false;

	private _callLaterList: Array<{ fn: (...args: unknown[]) => void; args: unknown[] }> = [];

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor() {
		this._frameDeltaTime = 1000 / this._frameRate;
		this._lastCount = this._frameInterval = Math.round(60000 / this._frameRate);
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	/**
	 * Configure before start(). Continue opts into fixed logical frames for both
	 * foreground and background; default pause retains wall-clock timestamps.
	 */
	public get backgroundPolicy(): BackgroundPolicy {
		return this._backgroundPolicy;
	}
	public set backgroundPolicy(value: BackgroundPolicy) {
		if (value === this._backgroundPolicy) {
			return;
		}
		if (value !== 'pause' && value !== 'continue') {
			throw new RangeError('Unknown background policy.');
		}
		if (this._running) {
			throw new Error('Configure backgroundPolicy before starting the ticker.');
		}
		this._generation++;
		this._backgroundPolicy = value;
		this._clock = value === 'continue' ? new LogicClock(wallTime()) : undefined;
	}

	/**
	 * Current logical milliseconds in continue mode, otherwise engine wall time.
	 * Use Date.now() for server deadlines and other real-world timestamps.
	 */
	public get time(): number {
		return this._clock?.time ?? wallTime();
	}

	/**
	 * Sampled, unprocessed logical milliseconds. Catch-up never discards this debt.
	 */
	public get pendingTime(): number {
		return this._clock?.pending ?? 0;
	}

	/**
	 * Requested rendered frame rate in frames per second, initially 30 for a
	 * standalone ticker. createPlayer() normally sets the shared rate to 60.
	 * Actual frame scheduling caps at 60 and remains browser-timing dependent.
	 */
	public get frameRate(): number {
		return this._frameRate;
	}

	/**
	 * Updates the requested frame rate in frames per second. Returns false for
	 * values <= 0 or an unchanged value; scheduling caps at 60 even when the
	 * reported requested value is larger. Supply a finite positive number.
	 */
	public setFrameRate(value: number): boolean {
		if (!Number.isFinite(value) || value <= 0 || this._frameRate === value) {
			return false;
		}
		this._frameRate = value;
		const capped = Math.min(value, 60);
		this._frameDeltaTime = 1000 / capped;
		this._lastCount = this._frameInterval = Math.round(60000 / capped);
		return true;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	public addPlayer(player: Renderable): void {
		if (!this._players.includes(player)) this._players.push(player);
	}

	public removePlayer(player: Renderable): void {
		const i = this._players.indexOf(player);
		if (i !== -1) {
			this._players.splice(i, 1);
		}
		if (this._players.length === 0 && this._clock) {
			this.stop();
		}
	}

	/**
	 * Registers a callback receiving absolute milliseconds on the getTimer() clock, not
	 * a delta or seconds. Returning true requests rendering. The callback runs
	 * without a receiver and is deduplicated by function identity. Use an arrow
	 * member or bind once when the callback needs instance state.
	 * Registration does not start scheduling. Continue mode runs callbacks once per
	 * logical frame, including replayed frames; pause mode retains browser tick cadence.
	 *
	 * @example
	 * ```ts
	 * import { ticker } from '@kurot/core';
	 *
	 * let previous: number | undefined;
	 * const onTick = (now: number): boolean => {
	 *   const deltaSeconds = previous === undefined ? 0 : (now - previous) / 1000;
	 *   previous = now;
	 *   console.log(deltaSeconds);
	 *   return false;
	 * };
	 * ticker.startTick(onTick);
	 * ticker.stopTick(onTick);
	 * ```
	 */
	public startTick(callback: TickCallback): void {
		if (this._ticks.includes(callback)) {
			return;
		}
		this._ticks.push(callback);
	}

	/**
	 * Detaches the exact function passed to startTick(). A missing callback is
	 * harmless; a newly bound callback is a different identity. Removal during
	 * an update takes effect on the next callback snapshot.
	 */
	public stopTick(callback: TickCallback): void {
		const i = this._ticks.indexOf(callback);
		if (i !== -1) {
			this._ticks.splice(i, 1);
		}
	}

	/**
	 * Queues work for the next render preparation while a Player is registered.
	 * This has no cancellation handle; guard callbacks owned by a disposed view.
	 */
	public callLater(fn: (...args: unknown[]) => void, ...args: unknown[]): void {
		this._callLaterList.push({ fn, args });
	}

	/**
	 * Starts host scheduling; repeated starts are harmless.
	 * This is shared scheduling, so stopping it affects all users of this ticker.
	 */
	public start(): void {
		if (this._running) return;
		this._running = true;
		this._lastTimeStamp = wallTime();
		this._clock?.rebase(wallTime());
		this.schedule();
	}

	/**
	 * Cancels all owned animation-frame, timeout and catch-up tasks without clearing players, tick
	 * callbacks, deferred calls or pause state. Registration owners must detach
	 * their own callbacks; stop() alone does not dispose them. Continue mode discards
	 * unprocessed debt and excludes the stopped interval on the next start().
	 */
	public stop(): void {
		this._running = false;
		this._generation++;
		this._scheduler.dispose();
		if (this._clock) {
			this._clock.pending = 0;
			this._clock.rebase(wallTime());
		}
	}

	/**
	 * Pauses callback execution and rendering while keeping the frame loop and
	 * registrations. This is a ticker-wide pause, affecting every registered user.
	 */
	public pause(): void {
		this._clock?.sample(wallTime(), this._isPaused);
		this._isPaused = true;
	}
	/**
	 * Clears the ticker-wide pause flag. This does not start a stopped frame loop
	 * or individually resume Tweens that were explicitly paused by their owner.
	 */
	public resume(): void {
		this._clock?.sample(wallTime(), this._isPaused);
		this._isPaused = false;
		this.schedule();
	}

	/**
	 * Manually processes an update. In pause mode forceUpdate bypasses rendered
	 * frame throttling. Continue mode consumes at most one due logical frame;
	 * forcing never invents elapsed time. Automatic catch-up yields a task between
	 * frames; manual drivers must preserve that boundary for promise callbacks.
	 */
	public update(forceUpdate = false): void {
		if (this._updating) {
			return;
		}
		this._updating = true;
		try {
			if (this._clock) {
				this.tickLogic();
			} else {
				this.tick(forceUpdate);
			}
		} finally {
			this._updating = false;
		}
	}

	/**
	 * Host visibility, independent of business pause()/resume(). Normally owned
	 * by setupLifecycle; native hosts may supply their own visibility signal.
	 */
	public setPageHidden(hidden: boolean): void {
		if (this._pageHidden === hidden) {
			return;
		}
		this._clock?.sample(wallTime(), this._isPaused);
		this._pageHidden = hidden;
		this.schedule();
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private schedule(): void {
		if (this._running) {
			this._scheduler.schedule(
				this._pageHidden && !!this._clock,
				!this._isPaused && !!this._clock?.hasStep(this._frameDeltaTime),
			);
		}
	}

	private tickLogic(): void {
		const clock = this._clock!;
		clock.sample(wallTime(), this._isPaused);
		if (this._isPaused || !clock.hasStep(this._frameDeltaTime)) {
			return;
		}
		clock.advance(this._frameDeltaTime);
		const generation = this._generation;
		const started = Date.now();
		for (const callback of [...this._ticks]) {
			callback(clock.time);
			if (generation !== this._generation) {
				return;
			}
		}
		// Retain the tick → deferred/render-event → ENTER_FRAME order without GPU work.
		this.prepareRender();
		if (generation !== this._generation) {
			return;
		}
		this.broadcastEnterFrame();
		if (generation !== this._generation) {
			return;
		}
		if (!this._pageHidden && !clock.hasStep(this._frameDeltaTime)) {
			for (const player of this._players) {
				player.render(true, Date.now() - started);
			}
			requestRenderingFlag = false;
		}
	}

	private tick(forceUpdate: boolean): void {
		const t1 = Date.now();
		const timeStamp = getTimer();

		if (this._isPaused || this._pageHidden) {
			this._lastTimeStamp = timeStamp;
			return;
		}

		let needRender = requestRenderingFlag;
		const ticks = [...this._ticks];
		for (const callback of ticks) {
			if (callback(timeStamp)) {
				needRender = true;
			}
		}

		const t2 = Date.now();
		const deltaTime = timeStamp - this._lastTimeStamp;
		this._lastTimeStamp = timeStamp;

		if (deltaTime >= this._frameDeltaTime || forceUpdate) {
			this._lastCount = this._frameInterval;
		} else {
			this._lastCount -= 1000;
			if (this._lastCount > 0) {
				if (needRender) this.render(false, this._costEnterFrame + t2 - t1);
				return;
			}
			this._lastCount += this._frameInterval;
		}

		this.render(true, this._costEnterFrame + t2 - t1);

		const t3 = Date.now();
		this.broadcastEnterFrame();
		this._costEnterFrame = Date.now() - t3;
	}

	private render(triggerByFrame: boolean, costTicker: number): void {
		if (this._players.length === 0) return;

		this.prepareRender();

		for (const player of this._players) {
			player.render(triggerByFrame, costTicker);
		}

		requestRenderingFlag = false;
	}

	private prepareRender(): void {
		if (this._players.length === 0) {
			return;
		}
		this.flushCallLaters();

		if (invalidateRenderFlag) {
			this.broadcastRender();
			invalidateRenderFlag = false;
		}

	}

	private broadcastEnterFrame(): void {
		const list = [...DisplayObject.$enterFrameCallBackList];
		for (const obj of list) {
			obj.dispatchEventWith(Event.ENTER_FRAME);
		}
	}

	private broadcastRender(): void {
		const list = [...DisplayObject.$renderCallBackList];
		for (const obj of list) {
			obj.dispatchEventWith(Event.RENDER);
		}
	}

	private flushCallLaters(): void {
		if (this._callLaterList.length === 0) return;
		const list = this._callLaterList;
		this._callLaterList = [];
		for (const entry of list) {
			entry.fn(...entry.args);
		}
	}
}

/**
 * Singleton ticker instance.
 */
export const ticker: SystemTicker = new SystemTicker();

/**
 * Returns engine milliseconds. Default mode uses wall time since engine start;
 * continue mode uses the shared logical clock, including during catch-up and
 * outside callbacks. Business pauses and stopped intervals do not advance it.
 * Use Date.now() for real-world/server deadlines, never mix the two clocks.
 */
export function getTimer(): number {
	return ticker.time;
}

/**
 * Sets up visibility change listeners to dispatch ACTIVATE/DEACTIVATE
 * events on the stage when the page is hidden/shown. Visibility never clears a
 * business pause. Configure before start(); defaults to backgroundPolicy: 'pause'.
 * The disposer removes listeners and stops continuous scheduling. Continue mode
 * cannot execute while the browser freezes JavaScript; it replays on delivery.
 */
export function setupLifecycle(stage: Stage, options: LifecycleOptions = {}): () => void {
	const previousPolicy = ticker.backgroundPolicy;
	ticker.backgroundPolicy = options.backgroundPolicy ?? 'pause';
	ticker.setPageHidden(document.hidden);
	let disposed = false;
	const onVisibilityChange = (): void => {
		if (document.hidden) {
			ticker.setPageHidden(true);
			stage.dispatchEventWith(Event.DEACTIVATE);
		} else {
			ticker.setPageHidden(false);
			stage.dispatchEventWith(Event.ACTIVATE);
		}
	};
	document.addEventListener('visibilitychange', onVisibilityChange);
	return () => {
		if (disposed) {
			return;
		}
		disposed = true;
		document.removeEventListener('visibilitychange', onVisibilityChange);
		if (ticker.backgroundPolicy === 'continue') {
			ticker.stop();
		}
		ticker.setPageHidden(false);
		ticker.backgroundPolicy = previousPolicy;
	};
}

function wallTime(): number {
	return Date.now() - START_TIME;
}
