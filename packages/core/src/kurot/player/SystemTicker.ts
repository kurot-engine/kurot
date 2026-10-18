import { Event } from '../events/Event.js';
import { DisplayObject } from '../display/DisplayObject.js';

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

interface TickEntry {
	callback: TickCallback;
	thisObject: unknown;
}

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
	private _ticks: TickEntry[] = [];
	private _frameRate = 30;
	private _frameDeltaTime: number;
	private _frameInterval: number;
	private _lastCount: number;
	private _lastTimeStamp = 0;
	private _costEnterFrame = 0;
	private _isPaused = false;
	private _rafId = 0;
	private _running = false;

	private _callLaterList: Array<{ fn: (...args: unknown[]) => void; args: unknown[] }> = [];

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor() {
		this._frameDeltaTime = 1000 / this._frameRate;
		this._lastCount = this._frameInterval = Math.round(60000 / this._frameRate);
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

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
		if (value <= 0 || this._frameRate === value) return false;
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
		if (i !== -1) this._players.splice(i, 1);
	}

	/**
	 * Registers a callback receiving absolute milliseconds from getTimer(), not
	 * a delta or seconds. Returning true requests rendering. The callback and
	 * thisObject pair is deduplicated and must match when calling stopTick().
	 * Registration does not start the requestAnimationFrame loop by itself.
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
	 * ticker.startTick(onTick, undefined);
	 * ticker.stopTick(onTick, undefined);
	 * ```
	 */
	public startTick(callback: TickCallback, thisObject: unknown): void {
		if (this.getTickIndex(callback, thisObject) !== -1) return;
		this._ticks.push({ callback, thisObject });
	}

	/**
	 * Detaches the exact callback/thisObject pair passed to startTick().
	 * A missing pair is harmless; a newly bound callback is a different identity.
	 */
	public stopTick(callback: TickCallback, thisObject: unknown): void {
		const i = this.getTickIndex(callback, thisObject);
		if (i !== -1) this._ticks.splice(i, 1);
	}

	/**
	 * Queues work for the next render preparation while a Player is registered.
	 * This has no cancellation handle; guard callbacks owned by a disposed view.
	 */
	public callLater(fn: (...args: unknown[]) => void, ...args: unknown[]): void {
		this._callLaterList.push({ fn, args });
	}

	/**
	 * Starts the requestAnimationFrame loop; repeated starts are harmless.
	 * This is shared scheduling, so stopping it affects all users of this ticker.
	 */
	public start(): void {
		if (this._running) return;
		this._running = true;
		this._lastTimeStamp = getTimer();
		this._rafId = requestAnimationFrame(this.onFrame);
	}

	/**
	 * Cancels the requestAnimationFrame loop without clearing players, tick
	 * callbacks, deferred calls or pause state. Registration owners must detach
	 * their own callbacks; stop() alone does not dispose them.
	 */
	public stop(): void {
		this._running = false;
		if (this._rafId) {
			cancelAnimationFrame(this._rafId);
			this._rafId = 0;
		}
	}

	/**
	 * Pauses callback execution and rendering while keeping the frame loop and
	 * registrations. This is a ticker-wide pause, affecting every registered user.
	 */
	public pause(): void {
		this._isPaused = true;
	}
	/**
	 * Clears the ticker-wide pause flag. This does not start a stopped frame loop
	 * or individually resume Tweens that were explicitly paused by their owner.
	 */
	public resume(): void {
		this._isPaused = false;
	}

	/**
	 * Force a single update (useful for testing).
	 */
	public update(forceUpdate = false): void {
		this.tick(forceUpdate);
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private onFrame = (): void => {
		if (!this._running) return;
		this.tick(false);
		this._rafId = requestAnimationFrame(this.onFrame);
	};

	private tick(forceUpdate: boolean): void {
		const t1 = Date.now();
		const timeStamp = getTimer();

		if (this._isPaused) {
			this._lastTimeStamp = timeStamp;
			return;
		}

		let needRender = requestRenderingFlag;
		const ticks = [...this._ticks];
		for (const entry of ticks) {
			if (entry.callback.call(entry.thisObject, timeStamp)) needRender = true;
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

		this.flushCallLaters();

		if (invalidateRenderFlag) {
			this.broadcastRender();
			invalidateRenderFlag = false;
		}

		for (const player of this._players) {
			player.render(triggerByFrame, costTicker);
		}

		requestRenderingFlag = false;
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

	private getTickIndex(callback: TickCallback, thisObject: unknown): number {
		for (let i = this._ticks.length - 1; i >= 0; i--) {
			if (this._ticks[i].callback === callback && this._ticks[i].thisObject === thisObject) return i;
		}
		return -1;
	}
}

/**
 * Singleton ticker instance.
 */
export const ticker: SystemTicker = new SystemTicker();

/**
 * Returns milliseconds since engine start.
 */
export function getTimer(): number {
	return Date.now() - START_TIME;
}

/**
 * Sets up visibility change listeners to dispatch ACTIVATE/DEACTIVATE
 * events on the stage when the page is hidden/shown.
 */
export function setupLifecycle(stage: import('../display/Stage.js').Stage): () => void {
	const onVisibilityChange = (): void => {
		if (document.hidden) {
			ticker.pause();
			stage.dispatchEventWith(Event.DEACTIVATE);
		} else {
			ticker.resume();
			stage.dispatchEventWith(Event.ACTIVATE);
		}
	};
	document.addEventListener('visibilitychange', onVisibilityChange);
	return () => document.removeEventListener('visibilitychange', onVisibilityChange);
}
