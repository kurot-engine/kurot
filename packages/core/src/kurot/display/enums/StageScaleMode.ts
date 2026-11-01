/**
 * ScreenAdapter policies for mapping design dimensions to the available CSS
 * viewport. Canvas backing-store resolution is configured separately.
 */
export const StageScaleMode = {
	/**
	 * Fills the viewport, allowing different horizontal and vertical scales.
	 */
	EXACT_FIT: 'exactFit',
	/**
	 * Uniformly fits all design content, leaving space outside it when needed.
	 */
	SHOW_ALL: 'showAll',
	/**
	 * Uses the CSS viewport size as logical stage size, subject to size rounding.
	 */
	NO_SCALE: 'noScale',
	/**
	 * Uniformly covers the viewport, cropping excess design content.
	 */
	NO_BORDER: 'noBorder',
	/**
	 * Preserves design width and adapts logical height to the viewport aspect ratio.
	 */
	FIXED_WIDTH: 'fixedWidth',
	/**
	 * Preserves design height and adapts logical width to the viewport aspect ratio.
	 */
	FIXED_HEIGHT: 'fixedHeight',
	/**
	 * Uses the smaller fit scale and expands the logical stage along the other axis.
	 */
	FIXED_NARROW: 'fixedNarrow',
	/**
	 * Uses the larger fit scale and reduces the logical stage along the other axis.
	 */
	FIXED_WIDE: 'fixedWide',
} as const;

export type StageScaleMode = (typeof StageScaleMode)[keyof typeof StageScaleMode];
