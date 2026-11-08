import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import type { Plugin } from 'esbuild';
import type { BuildContext } from '../pipeline.js';

/**
 * Checks changed application and namespace declarations before watch output emits.
 */
export function skinPartValidationPlugin(ctx: BuildContext): Plugin {
	return {
		name: 'kurot-skin-part-fields',
		setup(build): void {
			let declaration: string | undefined;
			let installed = new Set<string>();
			build.onStart(async () => {
				declaration = undefined;
				const result = await ctx.outputs.validateSkinParts?.();
				const diagnostics = result?.diagnostics ?? [];
				if (diagnostics.length === 0) {
					declaration = result?.declaration;
				}
				return {
					errors: diagnostics.map(diagnostic => ({
						text: `${diagnostic.code}: ${diagnostic.message}`,
						...(diagnostic.location ? { location: {
							file: path.resolve(ctx.project.root, diagnostic.location.file),
							line: diagnostic.location.line ?? 1,
							column: (diagnostic.location.column ?? 1) - 1,
						} } : {}),
					})),
				};
			});
			build.onEnd(async result => {
				if (result.errors.length > 0) {
					return;
				}
				const current = new Set<string>();
				for (const file of result.outputFiles ?? []) {
					await fs.mkdir(path.dirname(file.path), { recursive: true });
					await fs.writeFile(file.path, file.contents);
					current.add(file.path);
				}
				for (const file of installed) {
					if (!current.has(file)) {
						await fs.rm(file, { force: true });
					}
				}
				installed = current;
				if (declaration) {
					const file = path.join(ctx.project.root, '.kurot/skin-parts.d.ts');
					await fs.mkdir(path.dirname(file), { recursive: true });
					await fs.writeFile(file, declaration);
				}
			});
		},
	};
}

/**
 * Retries source contexts after a corrected Skin makes blocked declarations valid.
 */
export async function rebuildSkinPartSources(ctx: BuildContext): Promise<void> {
	await ctx.outputs.sourceRebuilder?.();
}
