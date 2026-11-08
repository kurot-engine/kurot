import * as fs from 'node:fs/promises';
import * as http from 'node:http';
import * as path from 'node:path';
import { logger } from '../utils/logger.js';
import type { DevServerOptions } from './dev-server.js';
import type { Project } from './project.js';

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
 * Serves static files from the project output directory.
 */
export async function startHttpServer(project: Project, options: DevServerOptions): Promise<http.Server> {
	const root = await fs.realpath(project.outputDir);
	const server = http.createServer(async (req, res) => {
		try {
			const pathname = decodeURIComponent((req.url ?? '/').split('?')[0]);
			if (!pathname.startsWith('/') || pathname.startsWith('//') || pathname.includes('\\') ||
				pathname.split('/').includes('..')) {
				res.writeHead(404);
				res.end('Not found');
				return;
			}
			const filePath = await fs.realpath(path.join(root, pathname === '/' ? 'index.html' : pathname));
			const relative = path.relative(root, filePath);
			if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
				res.writeHead(404);
				res.end('Not found');
				return;
			}
			const data = await fs.readFile(filePath);
			res.writeHead(200, { 'Content-Type': mimeType(filePath), 'Cache-Control': 'no-store' });
			res.end(data);
		} catch {
			res.writeHead(404);
			res.end('Not found');
		}
	});

	server.listen(options.port, '127.0.0.1', () => {
		const url = `http://localhost:${options.port}`;

		logger.success(`Dev server running at ${url}`);
		logger.info('Watching for changes (refresh the browser to reload)...');
		options.onEvent?.({ type: 'server-ready', url });
	});

	return server;
}

/**
 * Selects the response content type from the file extension.
 */
function mimeType(filePath: string): string {
	return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}
