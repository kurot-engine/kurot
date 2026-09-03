import type { StageScaleMode } from '../display/enums/StageScaleMode.js';
import type { OrientationMode } from '../display/enums/OrientationMode.js';

/**
 * Configuration options for initializing the Kurot engine.
 */
export interface KurotOptions {
	/**
	 * The canvas element to render into.
	 */
	canvas: HTMLCanvasElement;

	/**
	 * Frame rate (default: 60).
	 */
	frameRate?: number;

	/**
	 * Stage scale mode (default: 'showAll').
	 */
	scaleMode?: StageScaleMode;

	/**
	 * Initial content width in logical pixels.
	 */
	contentWidth?: number;

	/**
	 * Initial content height in logical pixels.
	 */
	contentHeight?: number;

	/**
	 * Backing-store pixel density.
	 *
	 * Defaults to the device pixel ratio, capped at 2 to balance sharpness and
	 * GPU memory use. Set this explicitly to override the automatic value.
	 */
	resolution?: number;

	/**
	 * Screen orientation mode (default: 'auto').
	 */
	orientation?: OrientationMode;

	/**
	 * Maximum simultaneous touch points (default: 99).
	 */
	maxTouches?: number;

	/**
	 * Background color as a CSS string (default: '#000000').
	 */
	background?: string;
}
