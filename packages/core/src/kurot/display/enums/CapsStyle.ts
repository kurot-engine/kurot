/**
 * Line endpoint styles for Graphics.lineStyle(). NONE maps to Canvas 'butt';
 * ROUND and SQUARE extend beyond the segment endpoint by half the stroke width.
 */
export const CapsStyle = {
	NONE: 'none',
	ROUND: 'round',
	SQUARE: 'square',
} as const;

export type CapsStyle = (typeof CapsStyle)[keyof typeof CapsStyle];
