/**
 * Orientation preferences stored by Stage and accepted by startup configuration.
 * They do not themselves lock device orientation or rotate the Canvas.
 */
export const OrientationMode = {
	AUTO: 'auto',
	PORTRAIT: 'portrait',
	LANDSCAPE: 'landscape',
	LANDSCAPE_FLIPPED: 'landscapeFlipped',
} as const;

export type OrientationMode = (typeof OrientationMode)[keyof typeof OrientationMode];
