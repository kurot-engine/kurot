/**
 * An offscreen Canvas 2D rendering buffer.
 * Wraps an HTMLCanvasElement + CanvasRenderingContext2D for offscreen drawing,
 * hit testing, and pixel readback.
 */
export class RenderBuffer {
	// ── Instance fields ───────────────────────────────────────────────────────

	public readonly surface: HTMLCanvasElement;
	public readonly context: CanvasRenderingContext2D;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(width = 0, height = 0) {
		this.surface = document.createElement('canvas');
		// willReadFrequently: this buffer is used for hit testing and pixel
		// readback (getImageData), so keeping it in CPU memory avoids GPU round-trips.
		const ctx = this.surface.getContext('2d', { willReadFrequently: true });
		if (!ctx) throw new Error('Failed to create Canvas 2D context');
		this.context = ctx;
		if (width > 0 && height > 0) this.resize(width, height);
	}

	// ── Getters ───────────────────────────────────────────────────────────────

	public get width(): number {
		return this.surface.width;
	}
	public get height(): number {
		return this.surface.height;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Resizes the buffer and clears its contents.
	 * @param useMaxSize If true, keeps the larger of the current and new dimensions.
	 */
	public resize(width: number, height: number, useMaxSize = false): void {
		const w = Math.ceil(Math.max(width, 1));
		const h = Math.ceil(Math.max(height, 1));
		if (useMaxSize) {
			if (this.surface.width < w) this.surface.width = w;
			if (this.surface.height < h) this.surface.height = h;
		} else {
			this.surface.width = w;
			this.surface.height = h;
		}
	}

	/**
	 * Returns pixel data for the specified region.
	 */
	public getPixels(x: number, y: number, width = 1, height = 1): number[] {
		const data = this.context.getImageData(x, y, width, height).data;
		return Array.from(data);
	}

	/**
	 * Converts the buffer to a base64 data URL.
	 */
	public toDataURL(type = 'image/png', quality?: number): string {
		return this.surface.toDataURL(type, quality);
	}

	/**
	 * Clears the entire buffer.
	 */
	public clear(): void {
		this.context.setTransform(1, 0, 0, 1, 0, 0);
		this.context.clearRect(0, 0, this.surface.width, this.surface.height);
	}

	/**
	 * Destroys the buffer, releasing the canvas memory.
	 */
	public destroy(): void {
		this.surface.width = 0;
		this.surface.height = 0;
	}
}

/** @internal Shared buffer for hit testing — lazily created on first use. */
let _hitTestBuffer: RenderBuffer | undefined;
export function hitTestBuffer(): RenderBuffer {
	if (!_hitTestBuffer) _hitTestBuffer = new RenderBuffer(3, 3);
	return _hitTestBuffer;
}
