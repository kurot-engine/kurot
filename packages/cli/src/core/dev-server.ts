import * as http from 'node:http';
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';
import { createContext, disposeContext, runPipeline } from './pipeline.js';
import {
	compileExml,
	compileEngine,
	compileCustomNamespaces,
	writeComponentCatalog,
	compileSource,
	generateHtml,
	copyAssets,
} from './plugins/index.js';
import { refreshGeneratedNamespaceEntries } from './plugins/compile-custom-namespaces.js';
import { refreshProjectComponents } from './components/discover-components.js';
import { logger } from '../utils/logger.js';
import type { DevEvent } from './diagnostics/index.js';
import type { BuildContext } from './pipeline.js';
import type { Project } from './project.js';

export interface DevServerOptions {
	/**
	 * Port for the dev server to listen on.
	 */
	readonly port: number;
	/**
	 * Whether to generate sourcemaps for the app bundle.
	 */
	readonly sourcemap: boolean;
	/**
	 * Whether supported warnings stop builds.
	 */
	readonly strict: boolean;
	/**
	 * Receives machine-readable lifecycle events.
	 */
	readonly onEvent?: (event: DevEvent) => void;
}

const MIME_TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'application/javascript',
	'.mjs': 'application/javascript',
	'.map': 'application/json',
	'.css': 'text/css',
	'.json': 'application/json',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.webp': 'image/webp',
	'.mp3': 'audio/mpeg',
	'.ogg': 'audio/ogg',
	'.wav': 'audio/wav',
	'.mp4': 'video/mp4',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.ttf': 'font/ttf',
};

/**
 * Starts a development server.
 *
 * The build pipeline runs once with watch enabled: esbuild rebuilds `main.js`
 * on every source change, and an `fs.watch` on `resource/` recompiles EXML and
 * re-copies assets. Files are served straight from the output directory.
 * The browser is not auto-reloaded — refresh manually to pick up changes.
 */
export async function startDevServer(project: Project, options: DevServerOptions): Promise<void> {
	const ctx = createContext(project, { sourcemap: options.sourcemap, watch: true, strict: options.strict });
	const startedAt = Date.now();
	options.onEvent?.({ type: 'build-start', reason: 'initial' });
	try {
		await runPipeline(ctx, [
			compileExml(),
			compileEngine(),
			compileCustomNamespaces(),
			writeComponentCatalog(),
			compileSource(),
			generateHtml(),
			copyAssets(),
		]);
		emitDiagnostics(ctx, options);
		options.onEvent?.({ type: 'build-complete', success: true, durationMs: Date.now() - startedAt });
	} catch (error) {
		emitDiagnostics(ctx, options);
		options.onEvent?.({ type: 'build-complete', success: false, durationMs: Date.now() - startedAt });
		throw error;
	}

	const componentSkinsWatched = watchComponents(project, ctx, options);
	watchResources(project, ctx, options, componentSkinsWatched);
	const server = startHttpServer(project, options);

	process.on('SIGINT', async () => {
		logger.info('Stopping dev server...');
		await disposeContext(ctx);
		server.close();
		process.exit(0);
	});
}

/**
 * Recompiles EXML and re-copies assets when a `.exml` file changes.
 */
function watchResources(
	project: Project,
	ctx: BuildContext,
	options: DevServerOptions,
	componentSkinsWatched: boolean,
): void {
	if (!project.config.exml) return;

	let debounce: ReturnType<typeof setTimeout> | undefined;
	let watcher: fsSync.FSWatcher;
	try {
		watcher = fsSync.watch(project.resourceDir, { recursive: true }, (_event, filename) => {
			if (!filename || !filename.endsWith('.exml')) return;
			if (componentSkinsWatched && project.componentConvention) {
				const changed = path.resolve(project.resourceDir, filename);
				if (isWithin(project.componentConvention.skinDir, changed)) return;
			}
			clearTimeout(debounce);
			debounce = setTimeout(async () => {
				const startedAt = Date.now();
				options.onEvent?.({ type: 'build-start', reason: 'exml-change' });
				logger.info(`EXML changed: ${path.basename(filename)}, recompiling...`);
				try {
					await compileExml().apply(ctx);
					await copyAssets().apply(ctx);
					emitDiagnostics(ctx, options);
					options.onEvent?.({ type: 'build-complete', success: true, durationMs: Date.now() - startedAt });
				} catch (err) {
					emitDiagnostics(ctx, options);
					options.onEvent?.({ type: 'build-complete', success: false, durationMs: Date.now() - startedAt });
					logger.error(`EXML recompile failed: ${err instanceof Error ? err.message : err}`);
				}
			}, 100);
		});
	} catch {
		logger.warn('EXML watcher unavailable (recursive fs.watch unsupported on this platform).');
		return;
	}
	ctx.disposers.push(() => watcher.close());
}

/**
 * Refreshes the component model and dependent artifacts when a reusable
 * component source or skin changes.
 */
function watchComponents(project: Project, ctx: BuildContext, options: DevServerOptions): boolean {
	const convention = project.componentConvention;
	if (!convention) return false;
	let debounce: ReturnType<typeof setTimeout> | undefined;
	const watchers: fsSync.FSWatcher[] = [];
	let skinWatcherActive = false;
	const schedule = (): void => {
		clearTimeout(debounce);
		debounce = setTimeout(async () => {
			const startedAt = Date.now();
			options.onEvent?.({ type: 'build-start', reason: 'source-change' });
			try {
				await refreshProjectComponents(project);
				await refreshGeneratedNamespaceEntries(ctx);
				await compileExml().apply(ctx);
				await writeComponentCatalog().apply(ctx);
				await copyAssets().apply(ctx);
				emitDiagnostics(ctx, options);
				options.onEvent?.({ type: 'build-complete', success: true, durationMs: Date.now() - startedAt });
			} catch (error) {
				emitDiagnostics(ctx, options);
				options.onEvent?.({ type: 'build-complete', success: false, durationMs: Date.now() - startedAt });
				logger.error(`Component refresh failed: ${error instanceof Error ? error.message : error}`);
			}
		}, 100);
	};

	for (const [directory, kind, accepts] of [
		[convention.sourceDir, 'source', (file: string): boolean => file.endsWith('.ts')],
		[convention.skinDir, 'skin', (file: string): boolean => file.endsWith('Skin.exml')],
	] as const) {
		try {
			const watcher = fsSync.watch(directory, { recursive: true }, (_event, filename) => {
				if (filename && accepts(filename)) {
					schedule();
				}
			});
			watchers.push(watcher);
			if (kind === 'skin') {
				skinWatcherActive = true;
			}
		} catch {
			logger.warn(`Component watcher unavailable for ${path.relative(project.root, directory)}.`);
		}
	}

	ctx.disposers.push(() => {
		clearTimeout(debounce);
		for (const watcher of watchers) {
			watcher.close();
		}
	});
	return skinWatcherActive;
}

function isWithin(directory: string, file: string): boolean {
	const relative = path.relative(directory, file);
	return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/**
 * Serves static files from the project output directory.
 */
function startHttpServer(project: Project, options: DevServerOptions): http.Server {
	const server = http.createServer(async (req, res) => {
		const url = (req.url ?? '/').split('?')[0];
		const filePath = path.join(project.outputDir, url === '/' ? 'index.html' : url);
		try {
			const data = await fs.readFile(filePath);
			res.writeHead(200, { 'Content-Type': mimeType(filePath) });
			res.end(data);
		} catch {
			res.writeHead(404);
			res.end('Not found');
		}
	});

	server.listen(options.port, () => {
		const url = `http://localhost:${options.port}`;
		logger.success(`Dev server running at ${url}`);
		logger.info('Watching for changes (refresh the browser to reload)...');
		options.onEvent?.({ type: 'server-ready', url });
	});
	return server;
}

function emitDiagnostics(ctx: BuildContext, options: DevServerOptions): void {
	for (const diagnostic of ctx.diagnostics.all()) {
		options.onEvent?.({ type: 'diagnostic', diagnostic });
	}
}

function mimeType(filePath: string): string {
	return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}
