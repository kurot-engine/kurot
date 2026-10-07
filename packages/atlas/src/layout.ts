import { AtlasError } from './AtlasError.js';
import { placeRectangles } from './max-rects.js';
import type { PackingHeuristic, Placement } from './max-rects.js';
import type { PackingOptions } from './options.js';
import type { PreparedSource } from './trim.js';

export interface AtlasLayout {
	width: number;
	height: number;
	placements: Placement[];
}

export function createLayout(sources: readonly PreparedSource[], options: PackingOptions): AtlasLayout {
	const items = sources.map(item => ({
		name: item.source.name,
		width: item.width + options.extrude * 2 + options.shapePadding,
		height: item.height + options.extrude * 2 + options.shapePadding,
	})).sort((a, b) =>
		b.width * b.height - a.width * a.height || Math.max(b.width, b.height) - Math.max(a.width, a.height) ||
		(a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
	);
	const margin = options.borderPadding * 2;
	const minWidth = Math.max(...items.map(item => item.width)) + margin;
	const minHeight = Math.max(...items.map(item => item.height)) + margin;
	const area = items.reduce((sum, item) => sum + item.width * item.height, 0);
	const candidates = powersOfTwo(minWidth, options.maxWidth).flatMap(width =>
		powersOfTwo(minHeight, options.maxHeight).map(height => ({ width, height })),
	).filter(size => (size.width - margin) * (size.height - margin) >= area &&
		size.width * size.height <= options.maxPixels,
	).sort((a, b) => a.width * a.height - b.width * b.height ||
		Math.abs(a.width - a.height) - Math.abs(b.width - b.height) || a.width - b.width,
	);
	const heuristics: readonly PackingHeuristic[] = ['short-side', 'area', 'long-side'];
	for (const size of candidates) {
		for (const heuristic of heuristics) {
			const placements = placeRectangles(items, size.width - margin, size.height - margin, heuristic);
			if (!placements) continue;
			return { ...size, placements: placements.map(rect => ({
				...rect, x: rect.x + options.borderPadding, y: rect.y + options.borderPadding,
			})) };
		}
	}
	throw new AtlasError('atlas-overflow', `Images do not fit a single power-of-two atlas within ${options.maxWidth}×${options.maxHeight} and maxPixels.`);
}

function powersOfTwo(min: number, max: number): number[] {
	const values: number[] = [];
	for (let value = 1; value <= max; value *= 2) {
		if (value >= min) {
			values.push(value);
		}
	}
	return values;
}
