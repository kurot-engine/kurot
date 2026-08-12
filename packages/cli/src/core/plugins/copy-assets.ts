import * as path from 'node:path';
import { copyDir, exists } from '../../utils/fs.js';
import type { BuildContext, BuildPlugin } from '../pipeline.js';

/**
 * Copies the project's `resource/` directory into the output.
 *
 * - The theme file is skipped — `compile EXML` emits it with the resolved skin
 *   payload, so copying the source version would overwrite it.
 * - `.exml` source files are skipped when EXML is enabled, since skins are
 *   compiled to a JS module and the runtime never reads raw `.exml` — this
 *   keeps the output clean, matching Egret's release.
 */
export function copyAssets(): BuildPlugin {
	return {
		name: 'copy assets',
		async apply(ctx: BuildContext): Promise<void> {
			const { project } = ctx;
			if (!(await exists(project.resourceDir))) return;

			const exml = project.config.exml;
			const themeName = exml ? path.basename(exml.themeFile) : undefined;

			const dest = path.join(project.outputDir, 'resource');
			await copyDir(project.resourceDir, dest, name => {
				if (name === themeName) return false;
				// Skins are compiled to a JS module — never ship raw .exml sources.
				if (exml && name.endsWith('.exml')) return false;
				return true;
			});
		},
	};
}
