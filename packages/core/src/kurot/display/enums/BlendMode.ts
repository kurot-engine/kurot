/**
 * Compositing names accepted by DisplayObject.blendMode. Values use Canvas 2D
 * operation names; available effects depend on the rendering backend.
 */
export const BlendMode = {
	/**
	 * Standard source-over alpha compositing.
	 */
	NORMAL: 'source-over',
	/**
	 * Adds source and destination colors using the 'lighter' operation.
	 */
	ADD: 'lighter',
	/**
	 * Removes destination coverage according to source alpha ('destination-out').
	 */
	ERASE: 'destination-out',

	MULTIPLY: 'multiply',
	SCREEN: 'screen',
	LIGHTEN: 'lighten',
	DARKEN: 'darken',
	DIFFERENCE: 'difference',
	OVERLAY: 'overlay',
	HARD_LIGHT: 'hard-light',
	SOFT_LIGHT: 'soft-light',
	COLOR_DODGE: 'color-dodge',
	COLOR_BURN: 'color-burn',
	EXCLUSION: 'exclusion',
	HUE: 'hue',
	SATURATION: 'saturation',
	COLOR: 'color',
	LUMINOSITY: 'luminosity',
} as const;

export type BlendMode = (typeof BlendMode)[keyof typeof BlendMode];

// Numeric codes are an internal lookup order, not a persistent resource format.
const blendModeList = Object.values(BlendMode) as BlendMode[];
const blendModeIndex: Record<string, number> = Object.fromEntries(blendModeList.map((v, i) => [v, i]));

/**
 * Converts a composite name to its internal code; unknown names select NORMAL.
 */
export function blendModeToNumber(blendMode: string): number {
	return blendModeIndex[blendMode] ?? 0;
}

/**
 * Converts an internal code to a composite name; invalid codes select NORMAL.
 */
export function numberToBlendMode(index: number): BlendMode {
	return blendModeList[index] ?? 'source-over';
}
