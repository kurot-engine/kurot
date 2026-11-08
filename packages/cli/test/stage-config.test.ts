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

	it('loads typed helper imports and refreshes only the root config', async () => {
		const root = await project();
		const file = path.join(root, 'kurot.config.ts');
		const helper = path.join(root, 'dimensions.ts');
		await fs.writeFile(helper, 'export const width: number = 640;');
		const config = (offset: number): string =>
			`import { width } from './dimensions.js'; const offset: number = ${offset}; export const stage = { width: width + offset };`;
		await fs.writeFile(file, config(10));
		expect((await loadConfig({ root })).stage.width).toBe(650);
		await fs.writeFile(helper, 'export const width: number = 800;');
		await fs.writeFile(file, config(20));
		expect((await loadConfig({ root, fresh: true })).stage.width).toBe(660);
	});
});

async function project(): Promise<string> {
	const root = await createCliProject();
	roots.push(root);
	return root;
}
