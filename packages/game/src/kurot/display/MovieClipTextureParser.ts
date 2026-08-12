import type { SpriteSheet, Texture } from '@kurot/core';

/** Validated atlas and registration data for one MovieClip frame texture. */
export interface MovieClipTextureSource {
	name: string;
	bitmapX: number;
	bitmapY: number;
	bitmapWidth: number;
	bitmapHeight: number;
	offsetX: number;
	offsetY: number;
}

/** Strategy used by MovieClipDataFactory to convert frame texture metadata. */
export interface MovieClipTextureParser {
	createFrameTexture(spriteSheet: SpriteSheet, source: MovieClipTextureSource): Texture;
}

/**
 * Converts frame metadata emitted by Egret's MovieClip exporter.
 *
 * Egret frame x/y values are registration-point-relative drawing offsets, not
 * transparent padding. The cropped bitmap dimensions therefore remain the
 * frame's drawable dimensions even when either offset is negative.
 */
export class EgretMovieClipTextureParser implements MovieClipTextureParser {

	createFrameTexture(spriteSheet: SpriteSheet, source: MovieClipTextureSource): Texture {
		return spriteSheet.createTexture(
			source.name,
			source.bitmapX,
			source.bitmapY,
			source.bitmapWidth,
			source.bitmapHeight,
			source.offsetX,
			source.offsetY,
			source.bitmapWidth,
			source.bitmapHeight,
		);
	}
}
