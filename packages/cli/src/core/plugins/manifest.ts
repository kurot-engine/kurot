import * as path from 'node:path';
import { writeFile } from '../../utils/fs.js';
import type { BuildContext, BuildPlugin } from '../pipeline.js';

/**
 * Writes `manifest.json` with engine and application script groups for release builds:
 *
 * ```json
 * { "initial": ["js/kurot.core.min_<hash>.js", ...], "game": ["js/main.min_<hash>.js"] }
 * ```
 *
 * `initial` lists engine chunks loaded first; `game` lists the compiled Skin
 * script, when present, followed by the application entry. No-op outside
 * release mode.
 */
export function writeManifest(): BuildPlugin {
	return {
		name: 'write manifest.json',

		/**
		 * Writes the runtime script manifest for release builds.
		 */
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
