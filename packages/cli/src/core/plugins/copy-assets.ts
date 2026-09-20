import * as path from 'node:path';
import { copyDir, exists } from '../../utils/fs.js';
import { KUI_THEME_OUTPUT_PATH } from '../project.js';
import type { BuildContext, BuildPlugin } from '../pipeline.js';

/**
 * Copies the project's `resource/` directory into the output.
 *
 * - The theme file is skipped — `compile KUI` emits it with the resolved skin
 *   payload, so copying the source version would overwrite it.
 * - `.kui.xml` source files are skipped when KUI is enabled, since skins are
 *   compiled to a JS module and the runtime never reads raw `.kui.xml`.
 */
export function copyAssets(): BuildPlugin {
	return {
		name: 'copy assets',
		async apply(ctx: BuildContext): Promise<void> {
			const { project } = ctx;
			if (!(await exists(project.resourceDir))) return;

			const ui = project.config.ui;
			const themeName = ui ? path.basename(KUI_THEME_OUTPUT_PATH) : undefined;

			const dest = path.join(project.outputDir, 'resource');
			await copyDir(project.resourceDir, dest, name => {
				if (name === themeName) return false;
				if (ui && name.endsWith('.kui.xml')) return false;
				return true;
			});
		},
	};
}
