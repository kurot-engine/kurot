import { Event } from '../events/Event.js';
import { ticker, setInvalidateRenderFlag } from '../player/SystemTicker.js';
import type { ScreenAdapter } from '../player/ScreenAdapter.js';
import { DisplayObjectContainer } from './DisplayObjectContainer.js';
import { OrientationMode } from './enums/OrientationMode.js';
import { StageScaleMode } from './enums/StageScaleMode.js';

/**
 * Root display container created by createPlayer(). Its logical stage
 * dimensions and scale mode define input coordinates independently of CSS
 * canvas size and physical render resolution.
 */
export class Stage extends DisplayObjectContainer {
	// ── Instance fields ───────────────────────────────────────────────────────

	private _stageWidth = 0;
	private _stageHeight = 0;
	private _scaleMode: StageScaleMode = StageScaleMode.SHOW_ALL;
	private _orientation: OrientationMode = OrientationMode.AUTO;
	private _maxTouches = 99;
	private _textureScaleFactor = 1;
	private _screenAdapter?: ScreenAdapter;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor() {
		super();
		this.$stage = this;
		this.$nestLevel = 1;
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	/**
	 * Current viewport width in logical stage units, initially 0 until sizing.
	 * It may differ from the configured design width and Canvas backing pixels.
	 */
	public get stageWidth(): number {
		return this._stageWidth;
	}
	/**
	 * Current viewport height in logical stage units, initially 0 until sizing.
	 * Input coordinates use these logical dimensions rather than CSS pixels.
	 */
	public get stageHeight(): number {
		return this._stageHeight;
	}

	/**
	 * Frame-rate preference of the shared ticker, not a per-stage timer.
	 * Explicit render requests can cause additional renders between scheduled frames.
	 */
	public get frameRate(): number {
		return ticker.frameRate;
	}
	public set frameRate(value: number) {
		ticker.setFrameRate(value);
	}

	/**
	 * Screen adaptation policy, SHOW_ALL by default. Changing it asks the attached
	 * ScreenAdapter to recalculate logical stage and CSS display dimensions.
	 */
	public get scaleMode(): StageScaleMode {
		return this._scaleMode;
	}
	public set scaleMode(value: StageScaleMode) {
		if (this._scaleMode === value) {
			return;
		}
		this._scaleMode = value;
		this.onScreenSizeChanged();
	}

	/**
	 * Stored orientation preference, AUTO by default. Changes request screen-size
	 * recalculation; this property alone does not rotate the Canvas or lock the device.
	 */
	public get orientation(): OrientationMode {
		return this._orientation;
	}
	public set orientation(value: OrientationMode) {
		if (this._orientation === value) {
			return;
		}
		this._orientation = value;
		this.onScreenSizeChanged();
	}

	/**
	 * Touch limit read when TouchHandler is created, initially 99. Later changes
	 * notify onMaxTouchesChanged(); the base hook does not update an existing handler.
	 */
	public get maxTouches(): number {
		return this._maxTouches;
	}
	public set maxTouches(value: number) {
		if (this._maxTouches === value) {
			return;
		}
		this._maxTouches = value;
		this.onMaxTouchesChanged();
	}

	/**
	 * Stage-local scale metadata, initially 1. Assignment does not change the
	 * Texture module's textureScaleFactor or existing textures' source density.
	 */
	public get textureScaleFactor(): number {
		return this._textureScaleFactor;
	}
	public set textureScaleFactor(value: number) {
		this._textureScaleFactor = value;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Requests Event.RENDER dispatch on the next ticker frame. Repeated calls
	 * before that frame coalesce through the shared invalidation flag.
	 */
	public invalidate(): void {
		setInvalidateRenderFlag(true);
	}

	/**
	 * Requests an adapter size refresh, then stores the supplied logical dimensions
	 * through resize(). Does not change the adapter's configured design size.
	 */
	public setContentSize(width: number, height: number): void {
		this.onScreenSizeChanged();
		this.resize(width, height);
	}

	// ── Adapter integration ───────────────────────────────────────────────────

	/**
	 * Stores logical viewport dimensions and dispatches Event.RESIZE, even if
	 * the dimensions are unchanged. Used by screen adaptation after layout.
	 */
	resize(width: number, height: number): void {
		this._stageWidth = width;
		this._stageHeight = height;
		this.dispatchEventWith(Event.RESIZE);
	}

	/**
	 * Attaches the screen adapter used by scale/orientation changes. Replacing it
	 * does not dispose the previous adapter or trigger an immediate size refresh.
	 */
	setScreenAdapter(adapter: ScreenAdapter): void {
		this._screenAdapter = adapter;
	}

	// ── Protected hooks ───────────────────────────────────────────────────────

	protected onScreenSizeChanged(): void {
		this._screenAdapter?.updateScreenSize();
	}

	// Platform subclasses may propagate the stored preference to their input handler.
	protected onMaxTouchesChanged(): void {
	}
}
