export const BlendMode = {
	NORMAL: 'source-over',
	ADD: 'lighter',
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

const blendModeList = Object.values(BlendMode) as BlendMode[];
const blendModeIndex: Record<string, number> = Object.fromEntries(blendModeList.map((v, i) => [v, i]));

export function blendModeToNumber(blendMode: string): number {
	return blendModeIndex[blendMode] ?? 0;
}

export function numberToBlendMode(index: number): BlendMode {
	return blendModeList[index] ?? 'source-over';
}
