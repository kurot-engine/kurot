export const BitmapFillMode = {
	REPEAT: 'repeat',
	SCALE: 'scale',
	CLIP: 'clip',
} as const;

export type BitmapFillMode = (typeof BitmapFillMode)[keyof typeof BitmapFillMode];
