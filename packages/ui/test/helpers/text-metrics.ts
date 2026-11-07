import { afterEach, beforeEach, vi } from 'vitest';

/**
 * Width-only fixtures still supply every required Canvas TextMetrics field.
 */
export function createTextMetrics(width: number): TextMetrics {
	return {
		width, actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0,
		actualBoundingBoxLeft: 0, actualBoundingBoxRight: width,
		fontBoundingBoxAscent: 0, fontBoundingBoxDescent: 0,
		emHeightAscent: 0, emHeightDescent: 0,
		alphabeticBaseline: 0, hangingBaseline: 0, ideographicBaseline: 0,
	};
}

/**
 * Canvas font frames are required even for empty editing rows. Tests concerned
 * with layout contracts use deterministic metrics rather than a native canvas.
 */
export function mockTextMetrics(): void {
	beforeEach(() => {
		const context = {
			font: '',
			measureText(text: string): TextMetrics {
				const size = Number(/([\d.]+)px/.exec(this.font)?.[1] ?? 30);
				return createTextMetrics((text.length * size) / 2);
			},
		};
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
			context as unknown as CanvasRenderingContext2D,
		);
	});
	afterEach(() => vi.restoreAllMocks());
}
