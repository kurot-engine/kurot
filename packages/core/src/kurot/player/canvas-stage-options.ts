import { OrientationMode } from '../display/enums/OrientationMode.js';
import { StageScaleMode } from '../display/enums/StageScaleMode.js';
import type { KurotOptions } from './KurotOptions.js';

type StageOptions = Required<Pick<KurotOptions, 'contentWidth' | 'contentHeight' | 'scaleMode' | 'orientation' | 'frameRate'>>;

/**
 * Read startup defaults once, before allocating Player resources. Explicit
 * options bypass their corresponding attributes, including malformed ones.
 */
export function resolveCanvasStageOptions(options: KurotOptions): StageOptions {
	const { canvas } = options;
	return {
		contentWidth: options.contentWidth ?? numberAttribute(canvas, 'data-content-width') ?? (canvas.width || 640),
		contentHeight: options.contentHeight ?? numberAttribute(canvas, 'data-content-height') ?? (canvas.height || 1136),
		frameRate: options.frameRate ?? numberAttribute(canvas, 'data-frame-rate', true) ?? 60,
		scaleMode: options.scaleMode ?? enumAttribute(canvas, 'data-scale-mode', Object.values(StageScaleMode)) ?? StageScaleMode.SHOW_ALL,
		orientation: options.orientation ?? enumAttribute(canvas, 'data-orientation', Object.values(OrientationMode)) ?? OrientationMode.AUTO,
	};
}

function numberAttribute(canvas: HTMLCanvasElement, name: string, integer = false): number | undefined {
	const raw = canvas.getAttribute(name);
	if (raw === null) {
		return undefined;
	}
	const value = Number(raw);
	if (!raw.trim() || !Number.isFinite(value) || value <= 0 || (integer && !Number.isInteger(value))) {
		throw new Error(`Invalid canvas ${name}: expected a positive ${integer ? 'integer' : 'finite number'}, got '${raw}'.`);
	}
	return value;
}

function enumAttribute<T extends string>(canvas: HTMLCanvasElement, name: string, values: readonly T[]): T | undefined {
	const raw = canvas.getAttribute(name);
	if (raw === null) {
		return undefined;
	}
	const value = values.find(candidate => candidate === raw.trim());
	if (value === undefined) {
		throw new Error(`Invalid canvas ${name}: expected ${values.join(', ')}, got '${raw}'.`);
	}
	return value;
}
