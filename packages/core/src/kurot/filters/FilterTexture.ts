import type { BitmapData } from '../display/texture/BitmapData.js';

/**
 * A full-image auxiliary sampler. The caller owns its BitmapData.
 * Cropped atlas Texture objects are not accepted; use a dedicated image.
 */
export interface FilterTexture {
	source: BitmapData;
	/**
	 * Linear filtering by default; false uses nearest-neighbor sampling.
	 * Auxiliary sampling never changes the same image's sprite sampling state.
	 */
	smoothing?: boolean;
	/**
	 * Affine transform [a,b,c,d,tx,ty] from filter UV to image UV.
	 * Defaults to [1,0,0,-1,0,1], converting bottom-left filter UVs to
	 * top-left image UVs. Uploaded as <samplerName>Matrix (mat3).
	 * <samplerName>Clamp (vec4) contains the image's texel-center UV bounds.
	 */
	transform?: readonly [number, number, number, number, number, number];
}
