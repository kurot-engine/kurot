import type { BuildPlugin } from '../pipeline.js';
import { cleanOutput } from './clean-output.js';
import { compileExml } from './compile-exml.js';
import { compileEngine } from './compile-engine.js';
import { compileCustomNamespaces } from './compile-custom-namespaces.js';
import { writeComponentCatalog } from './component-catalog.js';
import { compileSource } from './compile-source.js';
import { generateHtml } from './generate-html.js';
import { writeManifest } from './manifest.js';
import { copyAssets } from './copy-assets.js';

export { cleanOutput } from './clean-output.js';
export { compileExml } from './compile-exml.js';
export { compileEngine } from './compile-engine.js';
export { compileCustomNamespaces } from './compile-custom-namespaces.js';
export { writeComponentCatalog } from './component-catalog.js';
export { compileSource } from './compile-source.js';
export { generateHtml } from './generate-html.js';
export { writeManifest } from './manifest.js';
export { copyAssets } from './copy-assets.js';

/**
 * The standard build sequence.
 *
 * Order matters: `compileCustomNamespaces` must run before `compileSource`,
 * since the latter reads `ctx.outputs.namespaceModules` to mark namespace
 * files external and exclude them from per-file dev output (see
 * `compile-source.ts`). Engine and source compilation report their output
 * paths, then the HTML and manifest referencing them are written, and
 * finally static assets are copied.
 */
export function defaultPlugins(): BuildPlugin[] {
	return [
		cleanOutput(),
		compileExml(),
		compileEngine(),
		compileCustomNamespaces(),
		writeComponentCatalog(),
		compileSource(),
		generateHtml(),
		writeManifest(),
		copyAssets(),
	];
}
