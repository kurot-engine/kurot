import { describe, expect, it, vi } from 'vitest';
import { Bitmap } from '../src/kurot/display/Bitmap.js';
import { BitmapFillMode } from '../src/kurot/display/enums/BitmapFillMode.js';
import { BitmapData } from '../src/kurot/display/texture/BitmapData.js';
import { Texture } from '../src/kurot/display/texture/Texture.js';
import { Rectangle } from '../src/kurot/geom/Rectangle.js';
import { CanvasRenderer } from '../src/kurot/player/canvas/CanvasRenderer.js';
import { BitmapPipe } from '../src/kurot/player/pipes/BitmapPipe.js';
import type { RenderBuffer } from '../src/kurot/player/RenderBuffer.js';

function bitmap(trimmed = false): Bitmap {
	const texture = new Texture();
	texture.bitmapData = new BitmapData(document.createElement('canvas'));
	texture.initData(10, 20, trimmed ? 4 : 8, trimmed ? 3 : 6, trimmed ? 2 : 0, trimmed ? 1 : 0, 8, 6, 32, 32);
	const image = new Bitmap(texture);
	image.width = 19;
	image.height = 14;
	image.fillMode = BitmapFillMode.REPEAT;
	return image;
}

function render(image: Bitmap, canvas: boolean): number[][] {
	const drawImage = vi.fn();
	if (canvas) {
		new CanvasRenderer().renderBitmapToContext(image, { drawImage } as unknown as CanvasRenderingContext2D, 0, 0);
	} else {
		new BitmapPipe().execute({ renderPipeId: 'bitmap', renderable: image, offsetX: 0, offsetY: 0 }, {
			context: { drawImage },
			offsetX: 0,
			offsetY: 0,
		} as unknown as RenderBuffer);
	}
	return drawImage.mock.calls.map(call => call.slice(1, 9) as number[]);
}

describe.each([false, true])('natural-size bitmap fill, Canvas=%s', canvas => {
	it('repeats atlas regions and crops both last axes without stretching or reading adjacent frames', () => {
		const calls = render(bitmap(), canvas);
		expect(calls).toHaveLength(9);
		expect(calls[0]).toEqual([10, 20, 8, 6, 0, 0, 8, 6]);
		expect(calls[4]).toEqual([10, 20, 8, 6, 8, 6, 8, 6]);
		expect(calls[8]).toEqual([10, 20, 3, 2, 16, 12, 3, 2]);
	});

	it('preserves transparent trim margins in each original-size tile', () => {
		const calls = render(bitmap(true), canvas);
		expect(calls).toHaveLength(9);
		expect(calls[0]).toEqual([10, 20, 4, 3, 2, 1, 4, 3]);
		expect(calls[4]).toEqual([10, 20, 4, 3, 10, 7, 4, 3]);
		expect(calls[8]).toEqual([10, 20, 1, 1, 18, 13, 1, 1]);
	});

	it('ignores nine-slice while repeating', () => {
		const image = bitmap(true);
		image.scale9Grid = new Rectangle(2, 1, 1, 1);
		expect(render(image, canvas)[4]).toEqual([10, 20, 4, 3, 10, 7, 4, 3]);
	});

	it('clip keeps natural content size in a larger destination', () => {
		const image = bitmap(true);
		image.fillMode = BitmapFillMode.CLIP;
		image.scale9Grid = new Rectangle(2, 1, 1, 1);
		expect(render(image, canvas)).toEqual([[10, 20, 4, 3, 2, 1, 4, 3]]);
	});

	it('clip crops a smaller destination without reducing the texture scale', () => {
		const image = bitmap(true);
		image.fillMode = BitmapFillMode.CLIP;
		image.width = 3;
		image.height = 2;
		expect(render(image, canvas)).toEqual([[10, 20, 1, 1, 2, 1, 1, 1]]);
	});

	it('partial tiles that contain only transparent trim margins emit no draw', () => {
		const image = bitmap(true);
		image.width = 9;
		image.height = 7;
		expect(render(image, canvas)).toEqual([[10, 20, 4, 3, 2, 1, 4, 3]]);
	});

	it('preserves fractional destination edges', () => {
		const image = bitmap();
		image.width = 8.5;
		image.height = 6.25;
		expect(render(image, canvas).at(-1)).toEqual([10, 20, 0.5, 0.25, 8, 6, 0.5, 0.25]);
	});

	it.each([0, -1, Infinity, NaN])('rejects invalid or zero tile periods: %s', size => {
		const image = bitmap();
		image.textureWidth = size;
		expect(render(image, canvas)).toEqual([]);
	});
});

it('rotated repeat edge crops use the clockwise atlas origin and preserve sampling metadata', () => {
	const image = bitmap(true);
	image.texture!.rotated = true;
	image.smoothing = false;
	const drawImage = vi.fn();
	new BitmapPipe().execute({ renderPipeId: 'bitmap', renderable: image, offsetX: 0, offsetY: 0 }, {
		context: { drawImage },
	} as unknown as RenderBuffer);
	const last = drawImage.mock.calls.at(-1)!;
	expect(last.slice(1)).toEqual([12, 20, 1, 1, 18, 13, 1, 1, 32, 32, true, false]);
});
