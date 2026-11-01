/**
 * Texture filling policy for Bitmap's explicit logical dimensions.
 */
export const BitmapFillMode = {
	/**
	 * Tiles the logical texture frame without stretching each tile.
	 */
	REPEAT: 'repeat',
	/**
	 * Scales to the destination frame, applying scale9Grid when supplied.
	 */
	SCALE: 'scale',
	/**
	 * Keeps the natural texture size and clips it to the destination frame.
	 */
	CLIP: 'clip',
} as const;

export type BitmapFillMode = (typeof BitmapFillMode)[keyof typeof BitmapFillMode];
