import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlayer } from '../src/blakron/player/createPlayer.js';
import { Player } from '../src/blakron/player/Player.js';
import { ScreenAdapter } from '../src/blakron/player/ScreenAdapter.js';
import { TouchHandler } from '../src/blakron/player/TouchHandler.js';

describe('createPlayer lifecycle', () => {
	beforeEach(() => {
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((type: string) => {
			if (type !== '2d') return null;
			return {
				setTransform: vi.fn(),
				clearRect: vi.fn(),
				measureText: () => ({ width: 0 }),
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

		expect(getContext).toHaveBeenNthCalledWith(1, 'webgl2');
		expect(getContext).toHaveBeenNthCalledWith(2, 'webgl');
		expect(getContext).toHaveBeenNthCalledWith(3, '2d');
		// Canvas fallback creates one RenderBuffer; there is no additional
		// temporary canvas used solely to probe WebGL support.
		expect(createElement).toHaveBeenCalledOnce();
		expect(player.isWebGL).toBe(false);
		player.destroy();
	});
});
