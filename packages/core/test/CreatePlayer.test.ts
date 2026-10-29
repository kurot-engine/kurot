import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlayer } from '../src/kurot/player/createPlayer.js';
import { Player } from '../src/kurot/player/Player.js';
import { ScreenAdapter } from '../src/kurot/player/ScreenAdapter.js';
import { TouchHandler } from '../src/kurot/player/TouchHandler.js';
import { createTextMetrics } from './helpers/text-metrics.js';

describe('createPlayer lifecycle', () => {
	beforeEach(() => {
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((type: string) => {
			if (type !== '2d') return null;
			return {
				setTransform: vi.fn(),
				clearRect: vi.fn(),
				measureText: () => createTextMetrics(0),
			} as unknown as CanvasRenderingContext2D;
		});
	});

	afterEach(() => vi.restoreAllMocks());

	it('keeps stop resumable and reserves cleanup for destroy', () => {
		const disposeTouch = vi.spyOn(TouchHandler.prototype, 'dispose');
		const disposeScreen = vi.spyOn(ScreenAdapter.prototype, 'dispose');
		const destroyPlayer = vi.spyOn(Player.prototype, 'destroy');
		const removeDocumentListener = vi.spyOn(document, 'removeEventListener');
		const canvas = document.createElement('canvas');
		canvas.width = 320;
		canvas.height = 480;
		const app = createPlayer({ canvas });

		app.stop();
		expect(disposeTouch).not.toHaveBeenCalled();
		expect(disposeScreen).not.toHaveBeenCalled();

		app.start();
		app.stop();
		app.destroy();
		expect(disposeTouch).toHaveBeenCalledOnce();
		expect(disposeScreen).toHaveBeenCalledOnce();
		expect(destroyPlayer).toHaveBeenCalledOnce();
		expect(removeDocumentListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
		expect(() => app.start()).toThrow(/destroyed/);
	});

	it('tries WebGL directly on the supplied canvas without a probe canvas', () => {
		const canvas = document.createElement('canvas');
		const getContext = vi.spyOn(canvas, 'getContext');
		const createElement = vi.spyOn(document, 'createElement');

		const player = new Player(canvas);

		expect(getContext).toHaveBeenNthCalledWith(1, 'webgl2', { depth: false, stencil: true });
		expect(getContext).toHaveBeenNthCalledWith(2, 'webgl', { depth: false, stencil: true });
		expect(getContext).toHaveBeenNthCalledWith(3, '2d');
		// Canvas fallback creates one CanvasBuffer; there is no additional
		// temporary canvas used solely to probe WebGL support.
		expect(createElement).toHaveBeenCalledOnce();
		expect(player.isWebGL).toBe(false);
		player.destroy();
	});

	it('uses CLI canvas stage defaults for a canvas-only startup', () => {
		const canvas = document.createElement('canvas');
		Object.assign(canvas.dataset, { contentWidth: '1136', contentHeight: '640', scaleMode: 'exactFit', orientation: 'landscape', frameRate: '30' });
		const app = createPlayer({ canvas });
		try {
			expect(app.stage.stageWidth).toBe(1136);
			expect(app.stage.stageHeight).toBe(640);
			expect(app.stage.scaleMode).toBe('exactFit');
			expect(app.stage.orientation).toBe('landscape');
			expect(app.stage.frameRate).toBe(30);
			expect(app.screenAdapter.resolution).toBe(Math.min(window.devicePixelRatio || 1, 2));
		} finally {
			app.destroy();
		}
	});

	it('lets explicit values override even malformed corresponding attributes', () => {
		const canvas = document.createElement('canvas');
		Object.assign(canvas.dataset, { contentWidth: 'bad', contentHeight: '-1', scaleMode: 'bad', orientation: 'bad', frameRate: '0' });
		const app = createPlayer({ canvas, contentWidth: 320, contentHeight: 480, scaleMode: 'showAll', orientation: 'auto', frameRate: 60 });
		try {
			expect(app.stage.stageWidth).toBe(320);
			expect(app.stage.stageHeight).toBe(480);
			expect(app.stage.scaleMode).toBe('showAll');
			expect(app.stage.orientation).toBe('auto');
			expect(app.stage.frameRate).toBe(60);
		} finally {
			app.destroy();
		}
	});

	it('resolves each field independently and reads attributes only at creation', () => {
		const canvas = document.createElement('canvas');
		Object.assign(canvas.dataset, { contentWidth: 'bad', contentHeight: '720', frameRate: '45', orientation: 'landscapeFlipped' });
		const app = createPlayer({ canvas, contentWidth: 1280 });
		try {
			expect(app.stage.stageWidth).toBe(1280);
			expect(app.stage.stageHeight).toBe(720);
			expect(app.stage.scaleMode).toBe('showAll');
			expect(app.stage.orientation).toBe('landscapeFlipped');
			expect(app.stage.frameRate).toBe(45);
			canvas.dataset.contentHeight = '480';
			app.screenAdapter.updateScreenSize();
			expect(app.stage.stageHeight).toBe(720);
		} finally {
			app.destroy();
		}
	});

	it.each([[320, 480, 320, 480], [0, 0, 640, 1136]])('preserves canvas/default fallback without data attributes (%i × %i)', (width, height, expectedWidth, expectedHeight) => {
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const app = createPlayer({ canvas });
		try {
			expect(app.stage.stageWidth).toBe(expectedWidth);
			expect(app.stage.stageHeight).toBe(expectedHeight);
			expect(app.stage.scaleMode).toBe('showAll');
			expect(app.stage.orientation).toBe('auto');
			expect(app.stage.frameRate).toBe(60);
		} finally {
			app.destroy();
		}
	});

	it.each([
		['data-content-width', '0'], ['data-content-width', 'Infinity'], ['data-content-width', '640px'],
		['data-content-height', '-1'], ['data-content-height', ''], ['data-content-height', 'NaN'],
		['data-frame-rate', '0'], ['data-frame-rate', '29.5'], ['data-frame-rate', 'Infinity'],
		['data-scale-mode', 'unknown'], ['data-orientation', 'unknown'],
	])('rejects invalid %s=%s before allocating a renderer', (name, value) => {
		const canvas = document.createElement('canvas');
		canvas.setAttribute(name, value);
		const getContext = vi.spyOn(canvas, 'getContext');
		expect(() => createPlayer({ canvas })).toThrow(name);
		expect(getContext).not.toHaveBeenCalled();
	});
});
