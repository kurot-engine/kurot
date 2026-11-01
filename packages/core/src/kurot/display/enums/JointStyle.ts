/**
 * Stroke corner styles for Graphics.lineStyle(). MITER uses miterLimit to bound
 * sharp extensions; Canvas falls back to a bevel when that limit is exceeded.
 */
export const JointStyle = {
	BEVEL: 'bevel',
	MITER: 'miter',
	ROUND: 'round',
} as const;

export type JointStyle = (typeof JointStyle)[keyof typeof JointStyle];
