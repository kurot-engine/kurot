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
 * Keeps the browser viewport, canvas and logical stage size synchronized.
 */
export class ScreenAdapter {
	// ── Instance fields ───────────────────────────────────────────────────────

	private _player: Player;
	private _canvas: HTMLCanvasElement;
	private _touchHandler: TouchHandler;
	private _contentWidth: number;
	private _contentHeight: number;
	private readonly _resolution: number;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(
		player: Player,
		canvas: HTMLCanvasElement,
		touchHandler: TouchHandler,
		contentWidth: number,
		contentHeight: number,
		resolution = 1,
	) {
		this._player = player;
		this._canvas = canvas;
		this._touchHandler = touchHandler;
		this._contentWidth = contentWidth;
		this._contentHeight = contentHeight;
		this._resolution = Number.isFinite(resolution) && resolution > 0 ? resolution : 1;

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

	/**
	 * Updates CSS display size, high-density backing size, stage size and input scaling.
	 */
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

		this._canvas.style.width = size.displayWidth + 'px';
		this._canvas.style.height = size.displayHeight + 'px';
		const renderWidth = Math.max(1, Math.round(size.displayWidth * this._resolution));
		const renderHeight = Math.max(1, Math.round(size.displayHeight * this._resolution));

		this._player.updateStageSize(
			size.stageWidth,
			size.stageHeight,
			renderWidth,
			renderHeight,
		);

		Capabilities.boundingClientWidth = size.displayWidth;
		Capabilities.boundingClientHeight = size.displayHeight;

		const innerW = this._canvas.clientWidth || size.displayWidth;
		const innerH = this._canvas.clientHeight || size.displayHeight;
		const scaleX = size.stageWidth / innerW;
		const scaleY = size.stageHeight / innerH;
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

		if (stageWidth % 2 !== 0) stageWidth++;
		if (stageHeight % 2 !== 0) stageHeight++;
		if (displayWidth % 2 !== 0) displayWidth++;
		if (displayHeight % 2 !== 0) displayHeight++;

		return { stageWidth, stageHeight, displayWidth, displayHeight };
	}
}
