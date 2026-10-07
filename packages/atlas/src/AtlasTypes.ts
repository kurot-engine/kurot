/**
 * Straight-alpha, 8-bit RGBA pixels in row-major order. Input buffers are never mutated.
 */
export interface AtlasImage {
	readonly width: number;
	readonly height: number;
	readonly pixels: Uint8Array | Uint8ClampedArray;
}

/**
 * Name is the stable resource key; callers remove extensions or assign names explicitly.
 */
export interface AtlasSource extends AtlasImage {
	readonly name: string;
}

export interface AtlasOptions {
	/**
	 * Output PNG basename, default atlas.png. No directories or URLs.
	 */
	readonly file?: string;
	/**
	 * Upper dimension bounds, default 2048 each. Output axes are powers of two.
	 */
	readonly maxWidth?: number;
	readonly maxHeight?: number;
	/**
	 * Crop transparent borders, default true.
	 */
	readonly trim?: boolean;
	/**
	 * Alpha values at or above this byte value define content, default 1, range 1–255.
	 */
	readonly alphaThreshold?: number;
	/**
	 * Source pixels retained around the content bounding box, default 1.
	 */
	readonly trimMargin?: number;
	/**
	 * Repeated edge pixels outside each reported frame, default 1, including corners.
	 */
	readonly extrude?: number;
	/**
	 * Additional empty pixels after the extruded rectangle on its right and bottom, default 0.
	 */
	readonly shapePadding?: number;
	/**
	 * Empty margin around the packed content, default 0.
	 */
	readonly borderPadding?: number;
	/**
	 * Limit for total source pixels and output pixels, default 16,777,216.
	 */
	readonly maxPixels?: number;
}

/**
 * Frame coordinates exclude extrusion. Offsets place cropped pixels in the original canvas.
 * Uncropped frames omit offX/offY/sourceW/sourceH. No rotated frames are emitted.
 */
export interface AtlasFrame {
	x: number;
	y: number;
	w: number;
	h: number;
	offX?: number;
	offY?: number;
	sourceW?: number;
	sourceH?: number;
}

export interface AtlasData {
	file: string;
	frames: Record<string, AtlasFrame>;
}

export interface AtlasResult {
	image: AtlasImage;
	data: AtlasData;
}
