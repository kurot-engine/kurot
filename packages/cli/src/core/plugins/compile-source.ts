import * as esbuild from 'esbuild';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { logger } from '../../utils/logger.js';
import { namespaceEntriesPlugin } from '../namespace-entries.js';
import { startSourceWatch } from '../source-watch.js';
import { skinPartValidationPlugin } from '../kui/skin-part-watch.js';
import type { BuildContext, BuildPlugin } from '../pipeline.js';

interface Entry {
	in: string;
	out: string;
}

/**
 * Compile application and namespace entries together. esbuild owns shared modules;
 * import maps expose only the configured barrel, never its transitive imports.
 */
export function compileSource(): BuildPlugin {
	return {
		name: 'compile source',
		async apply(ctx: BuildContext): Promise<void> {
			const { project } = ctx;
			const release = project.mode === 'release';
			const namespaces = project.customNamespaces.filter(ns => ns.entry || ns.components?.length || ctx.watch);
			const applicationEntries: Entry[] = release
				? [{ in: project.entry, out: 'js/main' }]
				: (await collectSources(project.srcDir)).map(file => ({
					in: file, out: relativePath(project.srcDir, file).replace(/\.ts$/, ''),
				}));
			if (!applicationEntries.length) {
				applicationEntries.push({ in: project.entry, out: relativePath(project.srcDir, project.entry).replace(/\.ts$/, '') });
			}
			const namespaceEntries = namespaces.map(ns => ({ in: ns.specifier, out: `js/ns.${ns.prefix}` }));
			// In release, let each public barrel determine the evaluation order of its
			// shared closure, as when imported by a skin before the application starts.
			const entries = release ? [...namespaceEntries, ...applicationEntries] : [...applicationEntries, ...namespaceEntries];

			const options: esbuild.BuildOptions = {
				absWorkingDir: project.root,
				entryPoints: entries,
				outdir: project.outputDir,
				entryNames: release ? '[dir]/[name].min_[hash]' : '[dir]/[name]',
				chunkNames: 'js/chunks/[name]-[hash]',
				bundle: true,
				splitting: !release || namespaces.length > 0,
				format: 'esm', platform: 'browser', target: 'es2022', logLevel: 'warning',
				keepNames: release || namespaces.length > 0,
				minify: release,
				sourcemap: ctx.sourcemap,
				metafile: true,
				external: project.enginePackages,
				plugins: [
					namespaceEntriesPlugin(namespaces, project.root),
					...(ctx.watch ? [skinPartValidationPlugin(ctx)] : []),
				],
				define: {
					'process.env.DEBUG': JSON.stringify(!release),
					'process.env.RELEASE': JSON.stringify(release),
				},
			};

			const result = ctx.watch ? await startSourceWatch(ctx, options) : await esbuild.build(options);

			// Multiple entries may use the same barrel. Match the emitted entry name,
			// not the first JS file in the metafile (which may be a shared chunk).
			const outputs = Object.entries(result.metafile!.outputs)
				.filter(([file, meta]) => meta.entryPoint && file.endsWith('.js'))
				.map(([file]) => relativePath(project.outputDir, path.resolve(project.root, file)));
			const findOutput = (base: string): string => {
				const output = outputs.find(file => release ? file.startsWith(base + '.min_') : file === base + '.js');
				if (!output) {
					throw new Error(`Missing compiled entry: ${base}`);
				}
				return output;
			};
			ctx.outputs.entryScript = findOutput(release ? 'js/main' : relativePath(project.srcDir, project.entry).replace(/\.ts$/, ''));
			for (const ns of namespaces) {
				ctx.outputs.engine[ns.specifier] = findOutput(`js/ns.${ns.prefix}`);
			}
			if (release && ctx.analyze) {
				logger.info('Bundle analysis:\n' + (await esbuild.analyzeMetafile(result.metafile!)));
			}
		},
	};
}

function relativePath(from: string, to: string): string {
	return path.relative(from, to).split(path.sep).join('/');
}

/**
 * Preserve individually importable application modules in development.
 */
async function collectSources(dir: string): Promise<string[]> {
	const files: string[] = [];
	const entries = await fs.readdir(dir, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
		if (error.code === 'ENOENT') {
			return [];
		}
		throw error;
	});
	for (const entry of entries) {
		const file = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...await collectSources(file));
		} else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
			files.push(file);
		}
	}
	return files.sort();
}
