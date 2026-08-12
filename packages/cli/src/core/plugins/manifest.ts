import * as path from 'node:path';
import { writeFile } from '../../utils/fs.js';
import type { BuildContext, BuildPlugin } from '../pipeline.js';

/**
 * Writes Egret-style `manifest.json` for release builds:
 *
 * ```json
 * { "initial": ["js/blakron.core.min_<hash>.js", ...], "game": ["js/main.min_<hash>.js"] }
 * ```
 *
 * `initial` lists the engine chunks (loaded first), `game` the app entry. Skins
 * are embedded in `default.thm.json` and loaded at runtime, so they are not
 * listed here. No-op outside release mode.
 */
export function writeManifest(): BuildPlugin {
	return {
		name: 'write manifest.json',
		async apply(ctx: BuildContext): Promise<void> {
			if (ctx.project.mode !== 'release') return;

			const manifest = {
				initial: Object.values(ctx.outputs.engine),
				game: [ctx.outputs.skinsScript, ctx.outputs.entryScript].filter(Boolean),
			};
			await writeFile(
				path.join(ctx.project.outputDir, 'manifest.json'),
				JSON.stringify(manifest, null, '\t') + '\n',
			);
		},
	};
}
