import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const packageDir = fileURLToPath(new URL('..', import.meta.url));
const assets = process.argv[2] ? resolve(process.argv[2]) : undefined;
const bundle = await build({ entryPoints: [resolve(packageDir, 'examples/browser.ts')], bundle: true, write: false, format: 'esm', target: 'es2022', sourcemap: 'inline' });
const types: Record<string, string> = { png: 'image/png', json: 'application/json', dbbin: 'application/octet-stream' };
const server = createServer(async (request, response) => {
	try {
		const path = new URL(request.url ?? '/', 'http://localhost').pathname;
		if (path === '/bundle.js') {
			response.setHeader('Content-Type', 'text/javascript');
			response.end(bundle.outputFiles[0].contents);
		} else if (path === '/sample') {
			response.setHeader('Content-Type', 'application/json');
			response.end(JSON.stringify({ available: !!assets, prefix: '110' }));
		} else if (assets && /^\/assets\/\d+_(?:ske\.dbbin|tex\.json|tex\.png)$/.test(path)) {
			response.setHeader('Content-Type', types[path.split('.').at(-1)!]);
			response.end(await readFile(resolve(assets, path.slice('/assets/'.length))));
		} else if (path === '/') {
			response.setHeader('Content-Type', 'text/html');
			response.end(await readFile(resolve(packageDir, 'examples/index.html')));
		} else {
			response.writeHead(404).end();
		}
	} catch (error) {
		response.writeHead(500).end(String(error));
	}
});
server.listen(4179, '127.0.0.1', () => console.log('DragonBones example: http://127.0.0.1:4179'));
