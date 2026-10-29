import type { StageScaleMode } from '../display/enums/StageScaleMode.js';
import type { OrientationMode } from '../display/enums/OrientationMode.js';

/**
 * Configuration options for initializing the Kurot engine. Stage settings use
 * explicit options first, then the canvas attributes documented below, then
 * their original defaults. Attributes are read once when createPlayer is called.
 */
export interface KurotOptions {
	/**
	 * The canvas element to render into.
	 */
	canvas: HTMLCanvasElement;

	/**
	 * Target frame rate. Falls back to data-frame-rate, then 60.
	 */
	frameRate?: number;

	/**
	 * Stage scale mode. Falls back to data-scale-mode, then 'showAll'.
	 */
	scaleMode?: StageScaleMode;

	/**
	 * Initial content width in logical pixels. Falls back to data-content-width,
	 * then canvas.width or 640 when the canvas width is zero.
	 */
	contentWidth?: number;

	/**
	 * Initial content height in logical pixels. Falls back to data-content-height,
	 * then canvas.height or 1136 when the canvas height is zero.
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
	 * Screen orientation mode. Falls back to data-orientation, then 'auto'.
	 */
	orientation?: OrientationMode;

	/**
	 * Maximum simultaneous touch points (default: 99).
	 */
	maxTouches?: number;

	/**
	 * Optional CSS background applied to the canvas element. Omission leaves the
	 * canvas's existing CSS background unchanged; no default black value is assigned.
	 * This styles the element, not a retained display-list background object.
	 */
	background?: string;
}
