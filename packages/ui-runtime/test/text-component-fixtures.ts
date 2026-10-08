import { BitmapData, BitmapFont, Texture } from '@kurot/core';
import { beforeAll, vi } from 'vitest';

export function mockTextMeasurement(): void {
	beforeAll(() => {
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
			font: '',
			measureText: (text: string) => ({ width: text.length * 10 }),
		} as unknown as CanvasRenderingContext2D);
	});
}

export function createTestBitmapFont(): BitmapFont {
	const canvas = document.createElement('canvas');
	canvas.width = 32;
	canvas.height = 32;
	const texture = new Texture();
	texture.setBitmapData(new BitmapData(canvas));
	return new BitmapFont(
		texture,
		{ frames: { A: { x: 0, y: 0, w: 8, h: 10, sourceW: 10, sourceH: 12 } } },
		{ ownsTexture: false },
	);
}

export function requireInstance<T>(value: unknown, type: abstract new (...args: never[]) => T): T {
	if (value instanceof type) {
		return value;
	}
	throw new Error(`Expected ${type.name} instance.`);
}
