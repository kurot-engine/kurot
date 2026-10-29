import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/core/config.js';
import { createCliProject } from './cli-process-helpers.js';

const roots: string[] = [];

afterEach(async () => {
	await Promise.all(roots.splice(0).map(root => fs.rm(root, { recursive: true, force: true })));
});

describe('stage configuration', () => {
	it.each([
		['width', '0'], ['width', 'Infinity'], ['width', '"640"'],
		['height', '-1'], ['height', 'NaN'], ['frameRate', '29.5'],
		['orientation', '"unknown"'], ['scaleMode', '"unknown"'],
	])('rejects invalid %s=%s', async (key, value) => {
		const root = await project();
		await fs.writeFile(path.join(root, 'kurot.config.ts'), `export default { stage: { ${key}: ${value} } };`);
		await expect(loadConfig({ root, fresh: true })).rejects.toThrow(`stage.${key}`);
	});

	it('rereads edited TS configuration, including recovery from a syntax error', async () => {
		const root = await project();
		const file = path.join(root, 'kurot.config.ts');
		await fs.writeFile(file, 'export default { stage: { width: 900, orientation: "landscapeFlipped" } };');
		expect((await loadConfig({ root, fresh: true })).stage.width).toBe(900);
		await fs.writeFile(file, 'export default { stage: { width: 1200 } };');
		expect((await loadConfig({ root, fresh: true })).stage.width).toBe(1200);
		await fs.writeFile(file, 'export default {');
		await expect(loadConfig({ root, fresh: true })).rejects.toThrow();
		await fs.writeFile(file, 'export default { stage: { width: 900 } };');
		expect((await loadConfig({ root, fresh: true })).stage.width).toBe(900);
	});
});

async function project(): Promise<string> {
	const root = await createCliProject();
	roots.push(root);
	return root;
}
