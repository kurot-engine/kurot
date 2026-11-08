import * as fs from 'node:fs/promises';
import { get } from 'node:http';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { availablePort, createCliProject, runCli, startCli, stopCli, waitForJsonLine } from './cli-process-helpers.js';

describe('CLI output boundaries', () => {
	it.each(['build', 'clean'])('%s refuses an outside directory, even through a symlink', async command => {
		const root = await createCliProject();
		const sibling = await fs.mkdtemp(root + '-sibling-');
		try {
			await fs.mkdir(path.join(sibling, 'out'));
			const marker = path.join(sibling, 'out', 'marker');
			await fs.writeFile(marker, 'owned by another project');
			await fs.symlink(sibling, path.join(root, 'linked'), 'dir');
			for (const dir of [path.relative(root, path.join(sibling, 'out')), 'linked/out', 'src', '.']) {
				await fs.writeFile(path.join(root, 'kurot.config.ts'), 'export default ' + JSON.stringify({ output: { dir } }));
				expect((await runCli(root, [command])).exitCode).not.toBe(0);
				expect(await fs.readFile(marker, 'utf8')).toBe('owned by another project');
				await fs.access(path.join(root, 'src/Main.ts'));
			}
		} finally {
			await fs.rm(root, { recursive: true, force: true });
			await fs.rm(sibling, { recursive: true, force: true });
		}
	}, 30_000);

	it('serves output assets but refuses traversal and links outside the output', async () => {
		const root = await createCliProject();
		const port = await availablePort();
		const child = startCli(root, ['dev', '--port', String(port), '--diagnostics', 'jsonl']);
		try {
			await waitForJsonLine(child, event => event.type === 'server-ready');
			const out = path.join(root, 'bin-debug');
			await fs.writeFile(path.join(root, 'marker'), 'private');
			await fs.symlink(path.join(root, 'marker'), path.join(out, 'alias'));
			await fs.writeFile(path.join(out, 'asset space.txt'), 'public');
			for (const target of ['/../marker', '/%2e%2e%2fmarker', '/alias', '/%zz']) {
				expect((await request(port, target)).status).toBe(404);
			}
			expect(await request(port, '/asset%20space.txt?v=1')).toEqual({ status: 200, body: 'public' });
		} finally {
			await stopCli(child);
			await fs.rm(root, { recursive: true, force: true });
		}
	}, 30_000);
});

function request(port: number, target: string): Promise<{ status?: number; body: string }> {
	return new Promise((resolve, reject) => {
		get({ hostname: '127.0.0.1', port, path: target }, response => {
			let body = '';
			response.setEncoding('utf8');
			response.on('data', chunk => { body += chunk; });
			response.on('end', () => resolve({ status: response.statusCode, body }));
			response.on('error', reject);
		}).on('error', reject);
	});
}
