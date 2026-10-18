import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('..', import.meta.url));
const releases = await readdir(path.join(project, 'bin-release/web'));
const release = releases.filter(name => /^\d+$/.test(name)).sort().at(-1);
if (!release) throw new Error('Run pnpm release before browser checks.');

for (const [mode, directory] of [
	['development', 'bin-debug'], ['release', `bin-release/web/${release}`],
]) {
	const root = path.join(project, directory);
	const server = createServer(async (request, response) => {
		const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
		const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
		if (!file.startsWith(`${root}${path.sep}`)) {
			response.writeHead(403).end();
			return;
		}
		try {
			const body = await readFile(file);
			const types: Record<string, string> = {
				'.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.map': 'application/json',
			};
			response.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
			response.end(body);
		} catch (error) {
			const missing = error instanceof Error && 'code' in error && error.code === 'ENOENT';
			response.writeHead(missing ? 404 : 500).end();
		}
	});
	server.listen(0, '127.0.0.1');
	await once(server, 'listening');
	try {
		const address = server.address();
		if (!address || typeof address === 'string') throw new Error('Expected a TCP address.');
		const child = spawn(process.execPath, [
			path.join(project, 'node_modules/@playwright/test/cli.js'),
			'test', '--config', 'test/browser', '--workers=1', '--reporter=line', '--trace=retain-on-failure',
			'--output', `test-results/${mode}`,
		], {
			cwd: project, stdio: 'inherit',
			env: { ...process.env, GAME_URL: `http://127.0.0.1:${address.port}`, GAME_BUILD: mode },
		});
		const [code] = await once(child, 'exit');
		if (code !== 0) throw new Error(`${mode} browser checks failed (${code}).`);
	} finally {
		server.closeAllConnections();
		await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
	}
}
