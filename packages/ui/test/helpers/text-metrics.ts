import { afterEach, beforeEach, vi } from 'vitest';

/**
 * Canvas font frames are required even for empty editing rows. Tests concerned
 * with layout contracts use deterministic metrics rather than a native canvas.
 */
export function mockTextMetrics(): void {
	beforeEach(() => {
		const context = {
			font: '',
			measureText(text: string): { width: number } {
				const size = Number(/([\d.]+)px/.exec(this.font)?.[1] ?? 30);
				return { width: (text.length * size) / 2 };
			},
		};
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
			context as unknown as CanvasRenderingContext2D,
		);
	});
	afterEach(() => vi.restoreAllMocks());
}
