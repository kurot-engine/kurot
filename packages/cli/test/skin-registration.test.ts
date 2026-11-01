import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { createCliProject, runCli } from './cli-process-helpers.js';

const execute = promisify(execFile);
const roots: string[] = [];
const cases = (['development', 'release'] as const).flatMap(mode =>
	([undefined, 'global', 'module'] as const).map(registration => ({ mode, registration })),
);

afterEach(async () => {
	await Promise.all(roots.splice(0).map(root => fs.rm(root, { recursive: true, force: true })));
});

describe('compiled Skin registration', () => {
	it.each(cases)('executes $mode factories with registration=$registration', async ({ mode, registration }) => {
		const root = await createCliProject(
			'<Skin xmlns="https://kurot.dev/ui/1" class="skins.ButtonSkin"><Label id="labelDisplay" text="Play" /></Skin>',
		);
		roots.push(root);
		await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ type: 'module' }));
		await fs.writeFile(path.join(root, 'kurot.config.ts'), `export default ${JSON.stringify({
			ui: { sourceDir: 'resource/skins', ...(registration ? { skinRegistration: registration } : {}) },
		})};`);
		await installRuntimeDouble(root);

		const build = await runCli(root, ['build', '--strict', ...(mode === 'release' ? ['--release'] : [])]);
		expect(build.exitCode, build.stderr).toBe(0);
		const output = mode === 'release'
			? path.join(root, 'bin-release/web', (await fs.readdir(path.join(root, 'bin-release/web')))[0]!)
			: path.join(root, 'bin-debug');
		const themePath = path.join(output, 'resource/default.thm.json');
		const theme = JSON.parse(await fs.readFile(themePath, 'utf8')) as {
			skins: Record<string, string>;
			skinsJs: string;
		};
		expect(theme.skins).toEqual({ Button: 'skins.ButtonSkin' });
		expect(theme.skinsJs).toMatch(mode === 'release'
			? /^\.\.\/js\/default\.thm\.min_[\w-]+\.js$/
			: /^\.\.\/js\/default\.thm\.js$/);
		expect(await fs.readFile(path.join(root, '.kurot/skin-parts.d.ts'), 'utf8')).toContain('readonly "labelDisplay"');

		// A separate Node process uses its native ESM loader and isolates global mode.
		const result = await execute(process.execPath, ['--input-type=module', '--eval', `
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { Skin, Label } from '@kurot/ui';
const themeUrl = pathToFileURL(${JSON.stringify(themePath)});
const theme = JSON.parse(await readFile(themeUrl, 'utf8'));
const { skinFactories } = await import(new URL(theme.skinsJs, themeUrl).href);
const key = theme.skins.Button;
assert.deepEqual(Object.keys(skinFactories), [key]);
assert.equal(Object.isFrozen(skinFactories), true);
assert.equal(Object.hasOwn(globalThis, key), ${registration !== 'module'});
if (${registration !== 'module'}) {
	assert.equal(globalThis[key], skinFactories[key]);
}
const first = skinFactories[key]();
const second = skinFactories[key]();
assert.ok(first instanceof Skin);
assert.ok(first.labelDisplay instanceof Label);
assert.equal(first.labelDisplay.text, 'Play');
assert.equal(first.elementsContent[0], first.labelDisplay);
assert.notEqual(first, second);
assert.notEqual(first.labelDisplay, second.labelDisplay);
`], { cwd: root });
		expect(result.stderr).toBe('');
	});
});

async function installRuntimeDouble(root: string): Promise<void> {
	const directory = path.join(root, 'node_modules/@kurot/ui');
	await fs.mkdir(directory, { recursive: true });
	await fs.writeFile(path.join(directory, 'package.json'), JSON.stringify({
		name: '@kurot/ui', type: 'module', exports: './index.js',
	}));
	await fs.writeFile(path.join(directory, 'index.js'), `
export class Skin {
	skinParts = [];
	elementsContent = [];
}
export class Label {
	text = '';
}
`);
}
