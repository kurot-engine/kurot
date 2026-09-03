import { afterEach, describe, expect, it, vi } from 'vitest';
import { StageScaleMode } from '../src/kurot/display/enums/StageScaleMode.js';
import type { Player } from '../src/kurot/player/Player.js';
import { ScreenAdapter } from '../src/kurot/player/ScreenAdapter.js';
import type { TouchHandler } from '../src/kurot/player/TouchHandler.js';

describe('ScreenAdapter resolution', () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	it('separates logical stage size from the high-density backing store', () => {
		const container = document.createElement('div');
		const canvas = document.createElement('canvas');
		container.appendChild(canvas);
		document.body.appendChild(container);

		Object.defineProperties(container, {
			clientWidth: { value: 400 },
			clientHeight: { value: 710 },
		});

		const stage = {
			scaleMode: StageScaleMode.SHOW_ALL,
			setScreenAdapter: vi.fn(),
		};
		const player = {
			stage,
			updateStageSize: vi.fn(),
		} as unknown as Player;
		const touchHandler = {
			updateScale: vi.fn(),
		} as unknown as TouchHandler;

		const adapter = new ScreenAdapter(player, canvas, touchHandler, 640, 1136, 2);

		expect(canvas.style.width).toBe('400px');
		expect(canvas.style.height).toBe('710px');
		expect(player.updateStageSize).toHaveBeenCalledWith(640, 1136, 800, 1420);
		expect(touchHandler.updateScale).toHaveBeenCalledWith(1.6, 1.6);

		adapter.dispose();
	});

	it('resizes the backing store when resolution changes at runtime', () => {
		const container = document.createElement('div');
		const canvas = document.createElement('canvas');
		container.appendChild(canvas);
		document.body.appendChild(container);

		Object.defineProperties(container, {
			clientWidth: { value: 320 },
			clientHeight: { value: 480 },
		});

		const player = {
			stage: {
				scaleMode: StageScaleMode.NO_SCALE,
				setScreenAdapter: vi.fn(),
			},
			updateStageSize: vi.fn(),
		} as unknown as Player;
		const touchHandler = {
			updateScale: vi.fn(),
		} as unknown as TouchHandler;
		const adapter = new ScreenAdapter(player, canvas, touchHandler, 640, 1136, 1);

		adapter.resolution = 2;

		expect(adapter.resolution).toBe(2);
		expect(player.updateStageSize).toHaveBeenLastCalledWith(320, 480, 640, 960);
		expect(touchHandler.updateScale).toHaveBeenLastCalledWith(1, 1);

		adapter.dispose();
	});
});
