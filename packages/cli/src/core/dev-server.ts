import * as http from 'node:http';
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';
import type { Project } from './project.js';
import { createContext, runPipeline, disposeContext, type BuildContext } from './pipeline.js';
import {
	compileExml,
	compileEngine,
	compileCustomNamespaces,
	compileSource,
	generateHtml,
	copyAssets,
} from './plugins/index.js';
import { logger } from '../utils/logger.js';
import type { DevEvent } from './diagnostics/index.js';

export interface DevServerOptions {
	/**
	 * Port for the dev server to listen on.
	 */
	port: number;
	/**
	 * Whether to generate sourcemaps for the app bundle.
	 */
	sourcemap: boolean;
	/**
	 * Whether supported warnings stop builds.
	 */
	strict: boolean;
	/**
	 * Receives machine-readable lifecycle events.
	 */
	onEvent?: (event: DevEvent) => void;
}

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

	watchResources(project, ctx, options);
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
function watchResources(project: Project, ctx: BuildContext, options: DevServerOptions): void {
	if (!project.config.exml) return;

	let debounce: ReturnType<typeof setTimeout> | undefined;
	let watcher: fsSync.FSWatcher;
	try {
		watcher = fsSync.watch(project.resourceDir, { recursive: true }, (_event, filename) => {
			if (!filename || !filename.endsWith('.exml')) return;
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

function mimeType(filePath: string): string {
	return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}
