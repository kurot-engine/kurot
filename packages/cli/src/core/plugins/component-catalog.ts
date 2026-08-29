import * as path from 'node:path';
import { writeFile } from '../../utils/fs.js';
import type { BuildContext, BuildPlugin } from '../pipeline.js';

const CATALOG_PATH = '.kurot/component-catalog.json';

/**
 * Writes the development-time component catalog consumed by tooling.
 */
export function writeComponentCatalog(): BuildPlugin {
	return {
		name: 'write component catalog',
		async apply(ctx: BuildContext): Promise<void> {
			const { project } = ctx;
			if (project.mode !== 'development' || !project.componentConvention) return;
			const catalog = {
				schemaVersion: 1,
				namespace: project.componentConvention.prefix,
				components: project.components.map(component => ({
					name: component.name,
					tag: component.tag,
					source: component.sourceRelative,
					skin: component.skinRelative,
					skinClass: component.skinClass,
				})),
			};
			await writeFile(path.join(project.outputDir, CATALOG_PATH), `${JSON.stringify(catalog, null, '\t')}\n`);
			ctx.outputs.componentCatalog = CATALOG_PATH;
		},
	};
}
