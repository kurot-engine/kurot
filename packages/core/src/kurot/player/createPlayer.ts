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
import { CanvasRenderer, CanvasBuffer } from './canvas/index.js';
import type { KurotOptions } from './KurotOptions.js';
import { Capabilities } from '../system/Capabilities.js';

/**
 * Owns one Player, its stage, canvas input and browser lifecycle bindings.
 * Only one live Kurot application is supported at a time.
 */
export interface KurotApp {
	player: Player;
	stage: Stage;
	touchHandler: TouchHandler;
	screenAdapter: ScreenAdapter;
	/**
	 * Starts rendering and optionally attaches the root display object.
	 * Throws after destroy(); create a new application to mount again.
	 */
	start(root?: DisplayObject): void;
	/**
	 * Stops this Player without releasing input or lifecycle bindings.
	 * Application-owned ticker callbacks and Tweens require their own cleanup.
	 */
	stop(): void;
	/**
	 * Idempotently destroys the Player and detaches canvas input, sizing and
	 * lifecycle bindings. Remove application-owned handlers, ticker callbacks
	 * and Tweens separately; this does not dispose every resource in a scene.
	 */
	destroy(): void;
}

/**
 * Creates and initializes a Kurot player from the given options.
 * This is the main entry point for starting a Kurot application.
 * Use a single live application and call destroy() when its page/view closes.
 *
 * ```ts
 * import { createPlayer, Sprite } from '@kurot/core';
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
export function createPlayer(options: KurotOptions): KurotApp {
	Capabilities._init();

	if (!RenderTexture.renderer) {
		const _renderer = new CanvasRenderer();
		RenderTexture.renderer = (displayObject, width, height, offsetX, offsetY) => {
			const buffer = new CanvasBuffer(width, height);
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
		resolution = Math.min(window.devicePixelRatio || 1, 2),
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
	const screenAdapter = new ScreenAdapter(
		player,
		canvas,
		touchHandler,
		contentWidth,
		contentHeight,
		resolution,
	);
	const disposeLifecycle = setupLifecycle(stage);
	let destroyed = false;

	return {
		player,
		stage,
		touchHandler,
		screenAdapter,
		start(root?: DisplayObject): void {
			if (destroyed) throw new Error('Cannot start a destroyed Kurot application.');
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
