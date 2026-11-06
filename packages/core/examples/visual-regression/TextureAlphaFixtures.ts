import { BitmapData, Texture } from '../../src/index.js';

export interface AlphaFixture {
	texture: Texture;
	context: CanvasRenderingContext2D;
	alpha: readonly number[];
	width: number;
	height: number;
	setFirstAlpha(alpha: number): void;
}

/**
 * Opaque atlas neighbors expose sampling outside a frame. Each logical pixel
 * occupies density² source pixels, including rotated, trimmed frame views.
 */
export function makeAlphaFixture(density: number, rotated: boolean, second = false): AlphaFixture {
	const width = second ? 3 : 4;
	const height = second ? 4 : 3;
	const alpha = second
		? [0, 255, 0, 255, 1, 128, 0, 0, 255, 255, 0, 1]
		: [255, 255, 1, 0, 255, 0, 255, 127, 0, 255, 1, 255];
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = 32 * density;
	const context = canvas.getContext('2d')!;
	context.fillStyle = '#ff00ff';
	context.fillRect(0, 0, canvas.width, canvas.height);
	const left = (second ? 14 : 2) * density;
	const top = (second ? 1 : 8) * density;
	const pixels = context.createImageData((rotated ? height : width) * density, (rotated ? width : height) * density);
	for (let y = 0; y < height * density; y++) {
		for (let x = 0; x < width * density; x++) {
			const column = rotated ? height * density - 1 - y : x;
			const row = rotated ? x : y;
			const index = (row * pixels.width + column) * 4;
			pixels.data[index] = 255;
			pixels.data[index + 3] = alpha[Math.floor(y / density) * width + Math.floor(x / density)];
		}
	}
	context.putImageData(pixels, left, top);
	const texture = new Texture(density);
	texture.bitmapData = new BitmapData(canvas);
	texture.initData(left, top, width * density, height * density,
		(second ? -5 : 7) * density, (second ? 9 : -3) * density,
		16 * density, 16 * density, canvas.width, canvas.height, rotated);
	return {
		texture, context, alpha, width, height,
		setFirstAlpha(value: number): void {
			const pixel = context.createImageData(1, 1);
			pixel.data[3] = value;
			context.putImageData(pixel, left + (rotated ? height * density - 1 : 0), top);
		},
	};
}
