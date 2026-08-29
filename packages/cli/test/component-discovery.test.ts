import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { discoverComponents } from '../src/core/components/discover-components.js';
import type { ComponentConvention } from '../src/core/project.js';

const temporaryDirs: string[] = [];

afterEach(async () => {
	await Promise.all(temporaryDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

describe('component discovery', () => {
	it('pairs nested sources and skins and extracts the skin class', async () => {
		const fixture = await createFixture();
		await fixture.writeSource('bet/BetButton.ts', 'export class BetButton {}\n');
		await fixture.writeSkin(
			'bet/BetButtonSkin.exml',
			'<eui:Skin class="components.bet.BetButtonSkin" xmlns:eui="http://ns.egret.com/eui"/>',
		);

		await expect(discoverComponents(fixture.root, fixture.convention)).resolves.toEqual([
			expect.objectContaining({
				name: 'BetButton',
				tag: 'game:BetButton',
				sourceRelative: 'src/components/bet/BetButton.ts',
				skinRelative: 'resource/skins/components/bet/BetButtonSkin.exml',
				skinClass: 'components.bet.BetButtonSkin',
			}),
		]);
	});

	it('rejects a source without its relative-path skin pair', async () => {
		const fixture = await createFixture();
		await fixture.writeSource('BetButton.ts', 'export class BetButton {}\n');

		await expect(discoverComponents(fixture.root, fixture.convention)).rejects.toThrow(
			"Component source 'src/components/BetButton.ts' has no matching skin 'BetButtonSkin.exml'.",
		);
	});

	it('rejects a skin without its source pair', async () => {
		const fixture = await createFixture();
		await fixture.writeSkin(
			'BetButtonSkin.exml',
			'<eui:Skin class="components.BetButtonSkin" xmlns:eui="http://ns.egret.com/eui"/>',
		);

		await expect(discoverComponents(fixture.root, fixture.convention)).rejects.toThrow(
			"Component skin 'resource/skins/components/BetButtonSkin.exml' has no matching source 'BetButton.ts'.",
		);
	});

	it('requires a named class export matching the source file', async () => {
		const fixture = await createFixture();
		await fixture.writeSource('BetButton.ts', 'export class OtherButton {}\n');
		await fixture.writeSkin(
			'BetButtonSkin.exml',
			'<eui:Skin class="components.BetButtonSkin" xmlns:eui="http://ns.egret.com/eui"/>',
		);

		await expect(discoverComponents(fixture.root, fixture.convention)).rejects.toThrow(
			"must export a class named 'BetButton'",
		);
	});

	it('does not treat a commented class declaration as an export', async () => {
		const fixture = await createFixture();
		await fixture.writeSource('BetButton.ts', '// export class BetButton {}\nexport class OtherButton {}\n');
		await fixture.writeSkin(
			'BetButtonSkin.exml',
			'<eui:Skin class="components.BetButtonSkin" xmlns:eui="http://ns.egret.com/eui"/>',
		);

		await expect(discoverComponents(fixture.root, fixture.convention)).rejects.toThrow(
			"must export a class named 'BetButton'",
		);
	});

	it('rejects an abstract component that generated EXML code cannot instantiate', async () => {
		const fixture = await createFixture();
		await fixture.writeSource('BetButton.ts', 'export abstract class BetButton {}\n');
		await fixture.writeSkin(
			'BetButtonSkin.exml',
			'<eui:Skin class="components.BetButtonSkin" xmlns:eui="http://ns.egret.com/eui"/>',
		);

		await expect(discoverComponents(fixture.root, fixture.convention)).rejects.toThrow(
			"Component class 'BetButton' in 'src/components/BetButton.ts' must not be abstract.",
		);
	});

	it('requires a standard Skin root and class attribute', async () => {
		const fixture = await createFixture();
		await fixture.writeSource('BetButton.ts', 'export class BetButton {}\n');
		await fixture.writeSkin(
			'BetButtonSkin.exml',
			'<eui:Group xmlns:eui="http://ns.egret.com/eui"/>',
		);

		await expect(discoverComponents(fixture.root, fixture.convention)).rejects.toThrow(
			'must use an eui:Skin root',
		);
	});

	it('rejects duplicate component class names across subdirectories', async () => {
		const fixture = await createFixture();
		for (const directory of ['a', 'b']) {
			await fixture.writeSource(`${directory}/BetButton.ts`, 'export class BetButton {}\n');
			await fixture.writeSkin(
				`${directory}/BetButtonSkin.exml`,
				`<eui:Skin class="components.${directory}.BetButtonSkin" xmlns:eui="http://ns.egret.com/eui"/>`,
			);
		}

		await expect(discoverComponents(fixture.root, fixture.convention)).rejects.toThrow(
			"Component name 'BetButton' is duplicated",
		);
	});
});

async function createFixture(): Promise<{
	root: string;
	convention: ComponentConvention;
	writeSource(relative: string, source: string): Promise<void>;
	writeSkin(relative: string, source: string): Promise<void>;
}> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-component-discovery-'));
	temporaryDirs.push(root);
	const sourceDir = path.join(root, 'src/components');
	const skinDir = path.join(root, 'resource/skins/components');
	return {
		root,
		convention: { prefix: 'game', specifier: '#ns/game', sourceDir, skinDir },
		async writeSource(relative, source): Promise<void> {
			const file = path.join(sourceDir, relative);
			await fs.mkdir(path.dirname(file), { recursive: true });
			await fs.writeFile(file, source);
		},
		async writeSkin(relative, source): Promise<void> {
			const file = path.join(skinDir, relative);
			await fs.mkdir(path.dirname(file), { recursive: true });
			await fs.writeFile(file, source);
		},
	};
}
