import type { AtlasOptions, AtlasResult, AtlasSource } from './AtlasTypes.js';
import { createLayout } from './layout.js';
import { resolveOptions, validateSources } from './options.js';
import { renderAtlas } from './render.js';
import { prepareSource } from './trim.js';

/**
 * Packs one nonrotated atlas. Deterministic for the same named pixels and options,
 * independent of input order. Performs no I/O and never mutates source buffers.
 */
export function packAtlas(sources: readonly AtlasSource[], options: AtlasOptions = {}): AtlasResult {
	const settings = resolveOptions(options);
	validateSources(sources, settings);
	const prepared = sources.map(source => prepareSource(source, settings))
		.sort((a, b) => a.source.name < b.source.name ? -1 : a.source.name > b.source.name ? 1 : 0);
	return renderAtlas(prepared, createLayout(prepared, settings), settings);
}
