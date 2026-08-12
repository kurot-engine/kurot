import { Event } from '../events/Event.js';
import { ticker, setInvalidateRenderFlag } from '../player/SystemTicker.js';
import type { ScreenAdapter } from '../player/ScreenAdapter.js';
import { DisplayObjectContainer } from './DisplayObjectContainer.js';
import { OrientationMode } from './enums/OrientationMode.js';
import { StageScaleMode } from './enums/StageScaleMode.js';

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

	public get stageWidth(): number {
		return this._stageWidth;
	}
	public get stageHeight(): number {
		return this._stageHeight;
	}

	public get frameRate(): number {
		return ticker.frameRate;
	}
	public set frameRate(value: number) {
		ticker.setFrameRate(value);
	}

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

	public get textureScaleFactor(): number {
		return this._textureScaleFactor;
	}
	public set textureScaleFactor(value: number) {
		this._textureScaleFactor = value;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Marks the display list as needing a re-render.
	 * Triggers Event.RENDER to be dispatched on the next frame.
	 */
	public invalidate(): void {
		setInvalidateRenderFlag(true);
	}

	/**
	 * Sets the logical content size of the stage.
	 * Called by the player/screen adapter when the viewport changes.
	 */
	public setContentSize(width: number, height: number): void {
		this.onScreenSizeChanged();
		this.resize(width, height);
	}

	// ── Internal methods (called by player/renderer) ──────────────────────────

	/**
	 * Called by the renderer when the canvas/viewport is resized.
	 */
	resize(width: number, height: number): void {
		this._stageWidth = width;
		this._stageHeight = height;
		this.dispatchEventWith(Event.RESIZE);
	}

	// ── Protected hooks (override in platform adapters) ───────────────────────

	/** @internal Called by ScreenAdapter to register itself. */
	setScreenAdapter(adapter: ScreenAdapter): void {
		this._screenAdapter = adapter;
	}

	protected onScreenSizeChanged(): void {
		this._screenAdapter?.updateScreenSize();
	}

	protected onMaxTouchesChanged(): void {
		// Input system hook — handled at player level
	}
}
