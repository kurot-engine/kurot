import { Command } from 'commander';
import { loadProject } from '../core/project.js';
import { createContext, runPipeline, disposeContext } from '../core/pipeline.js';
import { defaultPlugins } from '../core/plugins/index.js';
import { BuildError } from '../core/errors.js';
import {
	DIAGNOSTIC_CODES,
	parseBuildDiagnosticsFormat,
	writeMachineOutput,
	type BuildDiagnosticsFormat,
} from '../core/diagnostics/index.js';
import { logger, setLoggerEnabled } from '../utils/logger.js';
import type { BuildContext } from '../core/pipeline.js';
import type { BuildMode } from '../core/project.js';

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
	strict: boolean;
	diagnostics: string;
}

export const buildCommand = new Command('build')
	.description('Build the project')
	.option('-r, --release', 'Minified, content-hashed release build (→ bin-release)', false)
	.option('--sourcemap', 'Generate sourcemaps', false)
	.option('--watch', 'Rebuild source on file changes', false)
	.option('--analyze', 'Print esbuild bundle size analysis', false)
	.option('--strict', 'Treat supported warnings as build errors', false)
	.option('--diagnostics <format>', 'Diagnostic output: human or json', 'human')
	.action(async (options: BuildOptions) => {
		const start = Date.now();
		const format = parseBuildDiagnosticsFormat(options.diagnostics);
		const machine = format === 'json';
		setLoggerEnabled(!machine);
		let ctx: BuildContext | undefined;
		let mode: BuildMode = options.release ? 'release' : 'development';
		try {
			if (options.watch && options.release) {
				logger.warn('--watch is a development workflow; ignoring --release.');
				mode = 'development';
			}

			const project = await loadProject(mode);
			logger.info(`Building (${project.mode})...`);

			const buildCtx = createContext(project, {
				sourcemap: options.sourcemap,
				analyze: options.analyze,
				watch: options.watch,
				strict: options.strict || project.mode === 'release',
			});
			ctx = buildCtx;
			if (options.watch && options.release) {
				buildCtx.diagnostics.report({
					code: DIAGNOSTIC_CODES.WATCH_RELEASE_IGNORED,
					severity: 'warning',
					message: 'Release mode was ignored because --watch uses development mode.',
				});
			}
			await runPipeline(buildCtx, defaultPlugins());

			if (options.watch) {
				logger.success('Watching for changes. Press Ctrl+C to stop.');
				await waitForShutdown(() => disposeContext(buildCtx));
			}

			const durationMs = Date.now() - start;
			logger.success(`Build completed in ${(durationMs / 1000).toFixed(2)}s → ${relativeOut(project.outputDir)}/`);
			if (machine) {
				writeMachineOutput({
					success: true,
					command: 'build',
					mode: project.mode,
					durationMs,
					outputDir: project.outputDir,
					diagnostics: buildCtx.diagnostics.all(),
				});
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			if (!machine) {
				throw new BuildError(`Build failed: ${message}`, err instanceof Error ? err : undefined);
			}
			writeMachineOutput({
				success: false,
				command: 'build',
				mode,
				durationMs: Date.now() - start,
				diagnostics: ctx?.diagnostics.all() ?? [],
			});
			process.exitCode = 1;
		} finally {
			setLoggerEnabled(true);
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
