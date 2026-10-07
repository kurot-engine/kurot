import type { AtlasFrame, AtlasResult } from './AtlasTypes.js';
import type { AtlasLayout } from './layout.js';
import type { PackingOptions } from './options.js';
import type { PreparedSource } from './trim.js';

export function renderAtlas(sources: readonly PreparedSource[], layout: AtlasLayout, options: PackingOptions): AtlasResult {
	const pixels = new Uint8Array(layout.width * layout.height * 4);
	const positions = new Map(layout.placements.map(rect => [rect.name, rect]));
	const frames = sources.map(item => {
		const rect = positions.get(item.source.name)!;
		const x = rect.x + options.extrude;
		const y = rect.y + options.extrude;
		const frame: AtlasFrame = { x, y, w: item.width, h: item.height };
		if (item.x !== 0 || item.y !== 0 || item.width !== item.source.width || item.height !== item.source.height) {
			frame.offX = item.x;
			frame.offY = item.y;
			frame.sourceW = item.source.width;
			frame.sourceH = item.source.height;
		}
		if (!item.empty) {
			blit(item, pixels, layout.width, x, y, options.extrude);
		}
		return [item.source.name, frame] as const;
	});
	return { image: { width: layout.width, height: layout.height, pixels }, data: { file: options.file, frames: Object.fromEntries(frames) } };
}

function blit(item: PreparedSource, target: Uint8Array, targetWidth: number, x: number, y: number, extrude: number): void {
	for (let dy = -extrude; dy < item.height + extrude; dy++) {
		const sy = item.y + Math.max(0, Math.min(item.height - 1, dy));
		for (let dx = -extrude; dx < item.width + extrude; dx++) {
			const sx = item.x + Math.max(0, Math.min(item.width - 1, dx));
			const sourceOffset = (sy * item.source.width + sx) * 4;
			const targetOffset = ((y + dy) * targetWidth + x + dx) * 4;
			const alpha = item.source.pixels[sourceOffset + 3]!;
			// Straight alpha is retained; hidden RGB is canonicalized to avoid stale transparent pixels.
			if (alpha === 0) continue;
			target[targetOffset] = item.source.pixels[sourceOffset]!;
			target[targetOffset + 1] = item.source.pixels[sourceOffset + 1]!;
			target[targetOffset + 2] = item.source.pixels[sourceOffset + 2]!;
			target[targetOffset + 3] = alpha;
		}
	}
}
