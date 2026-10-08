import type { Bitmap } from '../display/Bitmap.js';
import { BitmapFillMode } from '../display/enums/BitmapFillMode.js';
import { textureScaleFactor } from '../display/texture/Texture.js';

type BitmapRegionDrawer = (
	sourceX: number,
	sourceY: number,
	sourceWidth: number,
	sourceHeight: number,
	destX: number,
	destY: number,
	destWidth: number,
	destHeight: number,
) => void;

/**
 * Emits natural-size clip/repeat regions without stretching atlas content.
 * Tile periods include trim margins. Source origins are atlas coordinates;
 * source dimensions remain upright, matching RenderContext's rotated contract.
 */
export function drawUnscaledBitmapFill(bitmap: Bitmap, width: number, height: number, draw: BitmapRegionDrawer): void {
	const tileWidth = bitmap.textureWidth;
	const tileHeight = bitmap.textureHeight;
	const scale = textureScaleFactor;
	if (![width, height, tileWidth, tileHeight, scale].every(value => Number.isFinite(value) && value > 0)) {
		return;
	}
	const repeat = bitmap.fillMode === BitmapFillMode.REPEAT;
	const limitX = repeat ? width : Math.min(width, tileWidth);
	const limitY = repeat ? height : Math.min(height, tileHeight);
	const left = Math.max(0, bitmap.bitmapOffsetX);
	const top = Math.max(0, bitmap.bitmapOffsetY);
	const right = Math.min(tileWidth, bitmap.bitmapOffsetX + bitmap.bitmapWidth * scale);
	const bottom = Math.min(tileHeight, bitmap.bitmapOffsetY + bitmap.bitmapHeight * scale);
	const rotated = bitmap.texture?.rotated ?? false;

	for (let y = 0; y < limitY; y += tileHeight) {
		const drawHeight = Math.min(bottom, limitY - y) - top;
		if (drawHeight <= 0) continue;
		for (let x = 0; x < limitX; x += tileWidth) {
			const drawWidth = Math.min(right, limitX - x) - left;
			if (drawWidth <= 0) continue;
			const cropX = (left - bitmap.bitmapOffsetX) / scale;
			const cropY = (top - bitmap.bitmapOffsetY) / scale;
			const sourceWidth = drawWidth / scale;
			const sourceHeight = drawHeight / scale;
			const sourceX = bitmap.bitmapX + (rotated ? bitmap.bitmapHeight - cropY - sourceHeight : cropX);
			const sourceY = bitmap.bitmapY + (rotated ? cropX : cropY);
			draw(sourceX, sourceY, sourceWidth, sourceHeight, x + left, y + top, drawWidth, drawHeight);
		}
	}
}
