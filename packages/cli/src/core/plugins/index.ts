import type { BuildPlugin } from '../pipeline.js';
import { cleanOutput } from './clean-output.js';
import { compileKUI } from './compile-kui.js';
import { compileEngine } from './compile-engine.js';
import { writeComponentCatalog } from './component-catalog.js';
import { compileSource } from './compile-source.js';
import { generateHtml } from './generate-html.js';
import { writeManifest } from './manifest.js';
import { copyAssets } from './copy-assets.js';
import { versionResources } from './version-resources.js';

export { cleanOutput } from './clean-output.js';
export { compileKUI } from './compile-kui.js';
export { compileEngine } from './compile-engine.js';
export { writeComponentCatalog } from './component-catalog.js';
export { compileSource } from './compile-source.js';
export { generateHtml } from './generate-html.js';
export { writeManifest } from './manifest.js';
export { copyAssets } from './copy-assets.js';
export { versionResources } from './version-resources.js';

/**
 * The standard build sequence.
 *
 * Source compilation produces the application and namespace entries together
 * before HTML and manifest generation consumes their paths.
 */
export function defaultPlugins(): BuildPlugin[] {
	return [
		cleanOutput(),
		compileKUI(),
		compileEngine(),
		writeComponentCatalog(),
		compileSource(),
		generateHtml(),
		writeManifest(),
		copyAssets(),
		versionResources(),
	];
}
