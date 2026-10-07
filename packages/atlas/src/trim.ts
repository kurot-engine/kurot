import type { AtlasSource } from './AtlasTypes.js';
import type { PackingOptions } from './options.js';

export interface PreparedSource {
	source: AtlasSource;
	x: number;
	y: number;
	width: number;
	height: number;
	empty: boolean;
}

export function prepareSource(source: AtlasSource, options: PackingOptions): PreparedSource {
	if (!options.trim) {
		return { source, x: 0, y: 0, width: source.width, height: source.height, empty: false };
	}
	let left = source.width;
	let top = source.height;
	let right = -1;
	let bottom = -1;
	for (let y = 0; y < source.height; y++) {
		for (let x = 0; x < source.width; x++) {
			if (source.pixels[(y * source.width + x) * 4 + 3]! < options.alphaThreshold) continue;
			left = Math.min(left, x);
			top = Math.min(top, y);
			right = Math.max(right, x);
			bottom = Math.max(bottom, y);
		}
	}
	if (right < 0) {
		// A transparent placeholder retains original logical dimensions without zero-sized textures.
		return { source, x: 0, y: 0, width: 1, height: 1, empty: true };
	}
	left = Math.max(0, left - options.trimMargin);
	top = Math.max(0, top - options.trimMargin);
	right = Math.min(source.width - 1, right + options.trimMargin);
	bottom = Math.min(source.height - 1, bottom + options.trimMargin);
	return { source, x: left, y: top, width: right - left + 1, height: bottom - top + 1, empty: false };
}
