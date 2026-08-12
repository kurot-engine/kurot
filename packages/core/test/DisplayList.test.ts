import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DisplayObject } from '../src/blakron/display/DisplayObject.js';
import { Rectangle } from '../src/blakron/geom/Rectangle.js';
import { DisplayList } from '../src/blakron/player/canvas/DisplayList.js';
import { BitmapData } from '../src/blakron/display/texture/BitmapData.js';
import { SYM_GL_CONTEXT } from '../src/blakron/player/webgl/WebGLUtils.js';

beforeEach(() => {
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
});

afterEach(() => {
	vi.restoreAllMocks();
});

class BoundedDisplayObject extends DisplayObject {
	public override $measureContentBounds(bounds: Rectangle): void {
		bounds.setTo(-5, -10, 100, 50);
	}
}

describe('DisplayList texture cache', () => {
	it('allocates at the configured resolution while preserving logical offsets', () => {
		const root = new BoundedDisplayObject();
		const displayList = DisplayList.create(root)!;
		displayList.configure({ resolution: 2, scaleMode: 'nearest' });

		expect(displayList.updateSurfaceSize()).toBe(true);
		expect(displayList.renderBuffer.width).toBe(200);
		expect(displayList.renderBuffer.height).toBe(100);
		expect(displayList.offsetX).toBe(5);
		expect(displayList.offsetY).toBe(10);
		expect(displayList.actualResolution).toBe(2);
		expect(displayList.scaleMode).toBe('nearest');

		DisplayList.release(displayList);
	});

	it('clamps resolution to the renderer maximum texture size', () => {
		const displayList = DisplayList.create(new BoundedDisplayObject())!;
		displayList.configure({ resolution: 4 });

		displayList.updateSurfaceSize(120);
		expect(displayList.actualResolution).toBeCloseTo(1.2);
		expect(displayList.renderBuffer.width).toBe(120);
		expect(displayList.renderBuffer.height).toBe(60);

		DisplayList.release(displayList);
	});

	it('releases the owned GPU texture when caching is disabled', () => {
		const displayList = DisplayList.create(new BoundedDisplayObject())!;
		const deleteTexture = vi.fn();
		const texture = { [SYM_GL_CONTEXT]: { deleteTexture } } as unknown as WebGLTexture;
		displayList.bitmapData = new BitmapData(document.createElement('canvas'));
		displayList.bitmapData.webGLTexture = texture;

		DisplayList.release(displayList);

		expect(deleteTexture).toHaveBeenCalledWith(texture);
	});
});
