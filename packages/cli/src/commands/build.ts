import { Command } from 'commander';
import { loadProject } from '../core/project.js';
import { createContext, runPipeline, disposeContext } from '../core/pipeline.js';
import { defaultPlugins } from '../core/plugins/index.js';
import { BuildError } from '../core/errors.js';
import { logger } from '../utils/logger.js';

interface BuildOptions {
	/**
	 * Produce a minified, content-hashed release build under `bin-release`.
	 */
	release: boolean;
	/**
	 * Generate sourcemaps for the app bundle.
	 */
	sourcemap: boolean;
	/**
	 * Rebuild source on file changes (always uses development mode).
	 */
	watch: boolean;
	/**
	 * Print esbuild bundle size analysis after the build.
	 */
	analyze: boolean;
}

export const buildCommand = new Command('build')
	.description('Build the project')
	.option('-r, --release', 'Minified, content-hashed release build (→ bin-release)', false)
	.option('--sourcemap', 'Generate sourcemaps', false)
	.option('--watch', 'Rebuild source on file changes', false)
	.option('--analyze', 'Print esbuild bundle size analysis', false)
	.action(async (options: BuildOptions) => {
		const start = Date.now();
		try {
			const mode = options.release ? 'release' : 'development';
			if (options.watch && options.release) {
				logger.warn('--watch is a development workflow; ignoring --release.');
			}

			const project = await loadProject(options.watch ? 'development' : mode);
			logger.info(`Building (${project.mode})...`);

			const ctx = createContext(project, {
				sourcemap: options.sourcemap,
				analyze: options.analyze,
				watch: options.watch,
			});
			await runPipeline(ctx, defaultPlugins());

			if (options.watch) {
				logger.success('Watching for changes. Press Ctrl+C to stop.');
				await waitForShutdown(() => disposeContext(ctx));
				return;
			}

			const elapsed = ((Date.now() - start) / 1000).toFixed(2);
			logger.success(`Build completed in ${elapsed}s → ${relativeOut(project.outputDir)}/`);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			throw new BuildError(`Build failed: ${message}`, err instanceof Error ? err : undefined);
		}
	});

/**
 * Formats an absolute output directory as a path relative to the cwd, for
 * display in the success message.
 */
function relativeOut(outputDir: string): string {
	return outputDir.replace(process.cwd() + '/', '');
}

/**
 * Resolves when the process receives SIGINT, after running cleanup.
 */
function waitForShutdown(cleanup: () => Promise<void> | void): Promise<void> {
	return new Promise<void>(resolve => {
		process.on('SIGINT', async () => {
			await cleanup();
			resolve();
		});
	});
}
