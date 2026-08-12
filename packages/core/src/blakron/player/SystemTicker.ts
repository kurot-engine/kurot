import { Event } from '../events/Event.js';
import { DisplayObject } from '../display/DisplayObject.js';

export const START_TIME: number = Date.now();

/** @internal Flag: should broadcast Event.RENDER next frame. */
export let invalidateRenderFlag = false;
export function setInvalidateRenderFlag(value: boolean): void {
	invalidateRenderFlag = value;
}

/** @internal Flag: should re-render immediately after current event processing. */
export let requestRenderingFlag = false;
export function setRequestRenderingFlag(value: boolean): void {
	requestRenderingFlag = value;
}

type TickCallback = (timeStamp: number) => boolean;

interface TickEntry {
	callback: TickCallback;
	thisObject: unknown;
}

/** Render callback — called by SystemTicker each frame to render a player. */
export interface Renderable {
	render(triggerByFrame: boolean, costTicker: number): void;
}

/**
 * The core frame loop, equivalent to Egret's `sys.SystemTicker`.
 * Drives `requestAnimationFrame`, manages frame rate, broadcasts ENTER_FRAME / RENDER,
 * and invokes registered tick callbacks and player renderers.
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

	// Deferred calls (equivalent to egret.callLater)
	private _callLaterList: Array<{ fn: (...args: unknown[]) => void; args: unknown[] }> = [];

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor() {
		this._frameDeltaTime = 1000 / this._frameRate;
		this._lastCount = this._frameInterval = Math.round(60000 / this._frameRate);
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	public get frameRate(): number {
		return this._frameRate;
	}

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

	public startTick(callback: TickCallback, thisObject: unknown): void {
		if (this.getTickIndex(callback, thisObject) !== -1) return;
		this._ticks.push({ callback, thisObject });
	}

	public stopTick(callback: TickCallback, thisObject: unknown): void {
		const i = this.getTickIndex(callback, thisObject);
		if (i !== -1) this._ticks.splice(i, 1);
	}

	public callLater(fn: (...args: unknown[]) => void, ...args: unknown[]): void {
		this._callLaterList.push({ fn, args });
	}

	public start(): void {
		if (this._running) return;
		this._running = true;
		this._lastTimeStamp = getTimer();
		this._rafId = requestAnimationFrame(this.onFrame);
	}

	public stop(): void {
		this._running = false;
		if (this._rafId) {
			cancelAnimationFrame(this._rafId);
			this._rafId = 0;
		}
	}

	public pause(): void {
		this._isPaused = true;
	}
	public resume(): void {
		this._isPaused = false;
	}

	/** Force a single update (useful for testing). */
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

		// Execute tick callbacks
		let needRender = requestRenderingFlag;
		const ticks = [...this._ticks];
		for (const entry of ticks) {
			if (entry.callback.call(entry.thisObject, timeStamp)) needRender = true;
		}

		const t2 = Date.now();
		const deltaTime = timeStamp - this._lastTimeStamp;
		this._lastTimeStamp = timeStamp;

		// Frame rate throttling
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

		// Execute deferred calls
		this.flushCallLaters();

		// Broadcast RENDER event if requested
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

/** Singleton ticker instance. */
export const ticker: SystemTicker = new SystemTicker();

/** Returns milliseconds since engine start. */
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
