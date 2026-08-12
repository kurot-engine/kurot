import { StageScaleMode } from '../display/enums/StageScaleMode.js';
import { Player } from './Player.js';
import { TouchHandler } from './TouchHandler.js';
import { Capabilities } from '../system/Capabilities.js';

export interface StageDisplaySize {
	stageWidth: number;
	stageHeight: number;
	displayWidth: number;
	displayHeight: number;
}

/**
 * Manages the relationship between the browser viewport, the canvas element,
 * and the Stage logical size. Handles resize events and applies the configured
 * StageScaleMode.
 *
 * Equivalent to Egret's `sys.Screen` + `DefaultScreenAdapter`.
 */
export class ScreenAdapter {
	// ── Instance fields ───────────────────────────────────────────────────────

	private _player: Player;
	private _canvas: HTMLCanvasElement;
	private _touchHandler: TouchHandler;
	private _contentWidth: number;
	private _contentHeight: number;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(
		player: Player,
		canvas: HTMLCanvasElement,
		touchHandler: TouchHandler,
		contentWidth: number,
		contentHeight: number,
	) {
		this._player = player;
		this._canvas = canvas;
		this._touchHandler = touchHandler;
		this._contentWidth = contentWidth;
		this._contentHeight = contentHeight;

		window.addEventListener('resize', this.onResize);
		this._player.stage.setScreenAdapter(this);
		this.updateScreenSize();
	}

	// ── Public methods ────────────────────────────────────────────────────────

	public setContentSize(width: number, height: number): void {
		this._contentWidth = width;
		this._contentHeight = height;
		this.updateScreenSize();
	}

	public updateScreenSize(): void {
		const stage = this._player.stage;
		const container = this._canvas.parentElement;
		const screenWidth = container?.clientWidth ?? window.innerWidth;
		const screenHeight = container?.clientHeight ?? window.innerHeight;

		const size = this.calculateStageSize(
			stage.scaleMode,
			screenWidth,
			screenHeight,
			this._contentWidth,
			this._contentHeight,
		);

		this._canvas.width = size.displayWidth;
		this._canvas.height = size.displayHeight;
		this._canvas.style.width = size.displayWidth + 'px';
		this._canvas.style.height = size.displayHeight + 'px';

		this._player.updateStageSize(size.stageWidth, size.stageHeight);

		// Sync canvas bounding size into Capabilities for game code to read.
		Capabilities.boundingClientWidth = size.displayWidth;
		Capabilities.boundingClientHeight = size.displayHeight;

		// The WebGL renderer maps stage coordinates 1:1 to canvas buffer pixels
		// (projectionVector = canvasWidth/2, -canvasHeight/2).  To convert a
		// CSS-pixel offset within the canvas to a stage coordinate we need:
		//   stageCoord = cssPixel * (canvasBufferWidth / clientWidth)
		//
		// IMPORTANT: After the call to updateStageSize() above, the WebGL buffer
		// resize may have changed canvas.width from displayWidth to stageWidth.
		// So we must read canvas.width *now*, not reuse size.displayWidth.
		const innerW = this._canvas.clientWidth || size.displayWidth;
		const innerH = this._canvas.clientHeight || size.displayHeight;
		const scaleX = this._canvas.width / innerW;
		const scaleY = this._canvas.height / innerH;
		this._touchHandler.updateScale(scaleX, scaleY);
	}

	public dispose(): void {
		window.removeEventListener('resize', this.onResize);
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private onResize = (): void => {
		this.updateScreenSize();
	};

	private calculateStageSize(
		scaleMode: StageScaleMode,
		screenWidth: number,
		screenHeight: number,
		contentWidth: number,
		contentHeight: number,
	): StageDisplaySize {
		let displayWidth = screenWidth;
		let displayHeight = screenHeight;
		let stageWidth = contentWidth;
		let stageHeight = contentHeight;
		const scaleX = screenWidth / stageWidth || 0;
		const scaleY = screenHeight / stageHeight || 0;

		switch (scaleMode) {
			case StageScaleMode.EXACT_FIT:
				break;
			case StageScaleMode.FIXED_HEIGHT:
				stageWidth = Math.round(screenWidth / scaleY);
				break;
			case StageScaleMode.FIXED_WIDTH:
				stageHeight = Math.round(screenHeight / scaleX);
				break;
			case StageScaleMode.NO_BORDER:
				if (scaleX > scaleY) displayHeight = Math.round(stageHeight * scaleX);
				else displayWidth = Math.round(stageWidth * scaleY);
				break;
			case StageScaleMode.SHOW_ALL:
				if (scaleX > scaleY) displayWidth = Math.round(stageWidth * scaleY);
				else displayHeight = Math.round(stageHeight * scaleX);
				break;
			case StageScaleMode.FIXED_NARROW:
				if (scaleX > scaleY) stageWidth = Math.round(screenWidth / scaleY);
				else stageHeight = Math.round(screenHeight / scaleX);
				break;
			case StageScaleMode.FIXED_WIDE:
				if (scaleX > scaleY) stageHeight = Math.round(screenHeight / scaleX);
				else stageWidth = Math.round(screenWidth / scaleY);
				break;
			case StageScaleMode.NO_SCALE:
			default:
				stageWidth = screenWidth;
				stageHeight = screenHeight;
				break;
		}

		// Ensure even dimensions to avoid sub-pixel rendering issues
		if (stageWidth % 2 !== 0) stageWidth++;
		if (stageHeight % 2 !== 0) stageHeight++;
		if (displayWidth % 2 !== 0) displayWidth++;
		if (displayHeight % 2 !== 0) displayHeight++;

		return { stageWidth, stageHeight, displayWidth, displayHeight };
	}
}
