import { describe, expect, it, vi } from 'vitest';
import { Graphics } from '../src/kurot/display/Graphics.js';
import type { DisplayObject } from '../src/kurot/display/DisplayObject.js';
import { Matrix } from '../src/kurot/geom/Matrix.js';
import type { CanvasRenderer } from '../src/kurot/player/canvas/index.js';
import { GraphicsPipe } from '../src/kurot/player/pipes/GraphicsPipe.js';
import type { RenderBuffer } from '../src/kurot/player/RenderBuffer.js';

describe('GraphicsPipe', () => {
	it('re-rasterizes vector graphics for zoom while capping extreme scales', () => {
		const context2d = { setTransform: vi.fn(), clearRect: vi.fn() } as unknown as CanvasRenderingContext2D;
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context2d);

		const texture = {} as WebGLTexture;
		const context = {
			contextVersion: 0,
			maxTextureSize: 4096,
			createTexture: vi.fn(() => texture),
			updateTexture: vi.fn(),
			registerTextureForGC: vi.fn(),
			unregisterTextureGC: vi.fn(),
			drawTexture: vi.fn(),
		};
		const buffer = {
			context,
			globalMatrix: new Matrix(),
			saveTransform: vi.fn(),
			restoreTransform: vi.fn(),
		} as unknown as RenderBuffer;
		const canvasRenderer = { renderGraphicsToContext: vi.fn() } as unknown as CanvasRenderer;
		const graphics = new Graphics();
		graphics.lineStyle(1, 0xff0000);
		graphics.drawRect(0, 0, 100, 50);
		const pipe = new GraphicsPipe(canvasRenderer);
		const instruction = {
			renderPipeId: 'graphics' as const,
			renderable: {} as DisplayObject,
			graphics,
			offsetX: 0,
			offsetY: 0,
		};

		pipe.execute(instruction, buffer);
		const initialSurface = context.createTexture.mock.calls[0][0] as HTMLCanvasElement;
		const initialWidth = initialSurface.width;
		const initialHeight = initialSurface.height;
		buffer.globalMatrix.setTo(4, 0, 0, 4, 0, 0);
		pipe.execute(instruction, buffer);

		expect(context.updateTexture).toHaveBeenCalledOnce();
		expect(context2d.setTransform).toHaveBeenCalledWith(4, 0, 0, 4, 0, 0);
		expect((context.updateTexture.mock.calls[0][1] as HTMLCanvasElement).width).toBe(initialWidth * 4);
		expect((context.updateTexture.mock.calls[0][1] as HTMLCanvasElement).height).toBe(initialHeight * 4);
		expect(context.drawTexture).toHaveBeenLastCalledWith(
			texture,
			0,
			0,
			initialWidth * 4,
			initialHeight * 4,
			0,
			0,
			initialWidth,
			initialHeight,
			initialWidth * 4,
			initialHeight * 4,
		);

		pipe.execute(instruction, buffer);
		expect(context.updateTexture).toHaveBeenCalledOnce();

		buffer.globalMatrix.setTo(100, 0, 0, 100, 0, 0);
		pipe.execute(instruction, buffer);
		expect(context2d.setTransform).toHaveBeenLastCalledWith(8, 0, 0, 8, 0, 0);
		expect((context.updateTexture.mock.calls[1][1] as HTMLCanvasElement).width).toBe(initialWidth * 8);
	});
});
