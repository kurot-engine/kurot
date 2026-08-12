import type { StageScaleMode } from '../display/enums/StageScaleMode.js';
import type { OrientationMode } from '../display/enums/OrientationMode.js';

/**
 * Configuration options for initializing the Blakron engine.
 * Equivalent to Egret's `PlayerOption` + `runEgretOptions`.
 */
export interface BlakronOptions {
	/** The canvas element to render into. */
	canvas: HTMLCanvasElement;

	/** Frame rate (default: 60). */
	frameRate?: number;

	/** Stage scale mode (default: 'showAll'). */
	scaleMode?: StageScaleMode;

	/** Initial content width in logical pixels. */
	contentWidth?: number;

	/** Initial content height in logical pixels. */
	contentHeight?: number;

	/** Screen orientation mode (default: 'auto'). */
	orientation?: OrientationMode;

	/** Maximum simultaneous touch points (default: 99). */
	maxTouches?: number;

	/** Background color as a CSS string (default: '#000000'). */
	background?: string;
}
