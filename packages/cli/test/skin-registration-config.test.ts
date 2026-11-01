import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/core/config.js';
import { ConfigError } from '../src/core/errors.js';
import { createCliProject } from './cli-process-helpers.js';

const roots: string[] = [];

afterEach(async () => {
	await Promise.all(roots.splice(0).map(root => fs.rm(root, { recursive: true, force: true })));
});

describe('Skin registration configuration', () => {
	it.each([undefined, 'global', 'module'])('accepts registration=%s', async skinRegistration => {
		const root = await project(JSON.stringify({ sourceDir: 'resource/skins', skinRegistration }));
		const config = await loadConfig({ root, fresh: true });
		expect(config.ui?.skinRegistration).toBe(skinRegistration);
	});

	it.each(['"local"', '""', 'true', 'false', 'null', '0', '{}', '[]'])(
		'rejects registration=%s', async value => {
			const root = await project(`{ sourceDir: 'resource/skins', skinRegistration: ${value} }`);
			const loaded = loadConfig({ root, fresh: true });
			await expect(loaded).rejects.toBeInstanceOf(ConfigError);
			await expect(loaded).rejects.toThrow('ui.skinRegistration must be global or module');
		},
	);
});

async function project(uiSource: string): Promise<string> {
	const root = await createCliProject();
	roots.push(root);
	await fs.writeFile(path.join(root, 'kurot.config.ts'), `export default { ui: ${uiSource} };`);
	return root;
}
