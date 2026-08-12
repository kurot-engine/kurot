import { Stage } from '../display/Stage.js';
import { StageScaleMode } from '../display/enums/StageScaleMode.js';
import { OrientationMode } from '../display/enums/OrientationMode.js';
import { DisplayObject } from '../display/DisplayObject.js';
import { RenderTexture } from '../display/texture/RenderTexture.js';
import { Matrix } from '../geom/Matrix.js';
import { Player } from './Player.js';
import { TouchHandler } from './TouchHandler.js';
import { ScreenAdapter } from './ScreenAdapter.js';
import { setupLifecycle } from './SystemTicker.js';
import { CanvasRenderer, RenderBuffer } from './canvas/index.js';
import type { BlakronOptions } from './BlakronOptions.js';
import { Capabilities } from '../system/Capabilities.js';

export interface BlakronApp {
	player: Player;
	stage: Stage;
	touchHandler: TouchHandler;
	screenAdapter: ScreenAdapter;
	start(root?: DisplayObject): void;
	stop(): void;
	destroy(): void;
}

/**
 * Creates and initializes a Blakron player from the given options.
 * This is the main entry point for starting a Blakron application.
 *
 * ```ts
 * import { createPlayer, Sprite } from '@blakron/core';
 *
 * const app = createPlayer({
 *   canvas: document.getElementById('gameCanvas') as HTMLCanvasElement,
 *   contentWidth: 640,
 *   contentHeight: 1136,
 *   scaleMode: 'showAll',
 *   frameRate: 60,
 * });
 *
 * const root = new Sprite();
 * app.start(root);
 * ```
 */
export function createPlayer(options: BlakronOptions): BlakronApp {
	// Detect runtime environment once per session.
	Capabilities._init();

	// Wire up RenderTexture renderer once on first call
	if (!RenderTexture.renderer) {
		const _renderer = new CanvasRenderer();
		RenderTexture.renderer = (displayObject, width, height, offsetX, offsetY) => {
			const buffer = new RenderBuffer(width, height);
			const m = new Matrix();
			m.translate(offsetX, offsetY);
			_renderer.render(displayObject, buffer, m);
			return buffer.surface;
		};
	}
	const {
		canvas,
		frameRate = 60,
		scaleMode = StageScaleMode.SHOW_ALL,
		contentWidth = canvas.width || 640,
		contentHeight = canvas.height || 1136,
		orientation = OrientationMode.AUTO,
		maxTouches = 99,
		background,
	} = options;

	if (background) {
		canvas.style.backgroundColor = background;
	}

	const stage = new Stage();
	stage.scaleMode = scaleMode;
	stage.orientation = orientation;
	stage.maxTouches = maxTouches;
	stage.frameRate = frameRate;

	const player = new Player(canvas, stage);
	const touchHandler = new TouchHandler(stage, canvas);
	const screenAdapter = new ScreenAdapter(player, canvas, touchHandler, contentWidth, contentHeight);
	const disposeLifecycle = setupLifecycle(stage);
	let destroyed = false;

	return {
		player,
		stage,
		touchHandler,
		screenAdapter,
		start(root?: DisplayObject): void {
			if (destroyed) throw new Error('Cannot start a destroyed Blakron application.');
			player.start(root);
		},
		stop(): void {
			player.stop();
		},
		destroy(): void {
			if (destroyed) return;
			destroyed = true;
			player.destroy();
			touchHandler.dispose();
			screenAdapter.dispose();
			disposeLifecycle();
		},
	};
}
