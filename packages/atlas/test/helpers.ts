import type { AtlasImage, AtlasSource } from '../src/index.js';

export function makeSource(name: string, width: number, height: number, alpha = 255): AtlasSource {
	const pixels = new Uint8Array(width * height * 4);
	for (let i = 0; i < width * height; i++) {
		pixels.set([(i * 13 + 17) % 256, (i * 7 + 19) % 256, (i * 3 + 23) % 256, alpha], i * 4);
	}
	return { name, width, height, pixels };
}

export function pixel(image: AtlasImage, x: number, y: number): number[] {
	const offset = (y * image.width + x) * 4;
	return Array.from(image.pixels.slice(offset, offset + 4));
}

export function setPixel(source: AtlasSource, x: number, y: number, rgba: readonly number[]): void {
	source.pixels.set(rgba, (y * source.width + x) * 4);
}
