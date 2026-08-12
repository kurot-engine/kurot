export const CapsStyle = {
	NONE: 'none',
	ROUND: 'round',
	SQUARE: 'square',
} as const;

export type CapsStyle = (typeof CapsStyle)[keyof typeof CapsStyle];
