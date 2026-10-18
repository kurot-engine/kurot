import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import path from 'node:path';

export async function serve(root: string): Promise<{ url: string; close: () => Promise<void> }> {
	const server = createServer(async (request, response) => {
		try {
			const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
			const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
			if (!file.startsWith(`${root}${path.sep}`)) { response.writeHead(403).end(); return; }
			const body = await readFile(file);
			const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
			response.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' }).end(body);
		} catch (error) {
			response.writeHead(error instanceof Error && 'code' in error && error.code === 'ENOENT' ? 404 : 500).end();
		}
	});
	server.listen(0, '127.0.0.1');
	await once(server, 'listening');
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('Expected TCP address.');
	return {
		url: `http://127.0.0.1:${address.port}`,
		close: async (): Promise<void> => {
			server.closeAllConnections();
			await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
		},
	};
}
