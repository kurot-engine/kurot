import { BitmapData, BitmapFont, Texture } from '@kurot/core';
import { beforeAll, vi } from 'vitest';

export function mockTextMeasurement(): void {
	beforeAll(() => {
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
			font: '',
			// Zero font bounds keep authored size as the height in this width-only fixture.
			measureText: (text: string): TextMetrics => ({
				width: text.length * 10,
				actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0,
				actualBoundingBoxLeft: 0, actualBoundingBoxRight: text.length * 10,
				fontBoundingBoxAscent: 0, fontBoundingBoxDescent: 0,
				emHeightAscent: 0, emHeightDescent: 0,
				alphabeticBaseline: 0, hangingBaseline: 0, ideographicBaseline: 0,
			}),
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
