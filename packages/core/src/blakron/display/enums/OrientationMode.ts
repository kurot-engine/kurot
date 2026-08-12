export const OrientationMode = {
	AUTO: 'auto',
	PORTRAIT: 'portrait',
	LANDSCAPE: 'landscape',
	LANDSCAPE_FLIPPED: 'landscapeFlipped',
} as const;

export type OrientationMode = (typeof OrientationMode)[keyof typeof OrientationMode];
