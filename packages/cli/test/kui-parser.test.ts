/// <reference types="node" />

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generateCode, parseKUISkin } from '../src/core/kui/index.js';

const TEMPLATE_DIRECTORY = fileURLToPath(
	new URL('../templates/game/resource/ui/skins/', import.meta.url),
);

describe('KUI Skin compiler', () => {
	it('compiles canonical component tags, typed resources, parts, and states', () => {
		const source = `<?xml version="1.0" encoding="utf-8"?>
<Skin xmlns="https://kurot.dev/ui/1" id="skins.ButtonSkin" version="2" target="kui.Button" default="true">
	<contract>
		<parts><part name="labelDisplay" node="labelDisplay" /></parts>
		<states><state name="down"><set target="background" property="alpha" value="0.8" /></state></states>
	</contract>
	<Group id="root" minWidth="100">
		<Image id="background" source="@resource:image:button_up_png" width="100%" />
		<Label id="labelDisplay" text="Play" />
	</Group>
</Skin>
`;
		const ir = parseKUISkin(source);
		const generated = generateCode(ir);

		expect(ir.className).toBe('skins.ButtonSkin');
		expect(ir.skinParts).toEqual(['labelDisplay']);
		expect(generated).toContain('skin.elementsContent = [root];');
		expect(generated).toContain('root.elementsContent = [background, labelDisplay];');
		expect(generated).toContain('background.source = "button_up_png";');
		expect(generated).toContain('background.percentWidth = 100;');
		expect(generated).toContain('new State("down", [new SetProperty("background", "alpha", 0.8)])');
	});

	it('resolves project component namespaces without EUI aliases', () => {
		const source = `
<Skin xmlns="https://kurot.dev/ui/1" xmlns:game="https://kurot.dev/components/game"
	id="skins.HostSkin" version="2" target="game.Host" default="true">
	<Group id="root"><game:Badge id="badge" /></Group>
</Skin>`;
		const ir = parseKUISkin(source, undefined, [{
			prefix: 'game',
			specifier: '#ns/game',
			componentNames: new Set(['Badge']),
		}]);

		expect(ir.imports.get('Badge')).toBe('#ns/game');
		expect(ir.unresolvedTags).toEqual([]);
	});

	it('keeps unknown tags as source-located diagnostics input', () => {
		const source = `
<Skin xmlns="https://kurot.dev/ui/1" id="skins.Invalid" version="2" target="kui.Button">
	<Group id="root"><Buton id="broken" /></Group>
</Skin>`;
		const ir = parseKUISkin(source);

		expect(ir.unresolvedTags[0]).toMatchObject({ name: 'Buton' });
		expect(ir.children[0]?.children).toEqual([]);
	});

	it('compiles every bundled template skin', async () => {
		const files = (await fs.readdir(TEMPLATE_DIRECTORY))
			.filter(file => file.endsWith('.kui.xml'))
			.sort();

		expect(files).toHaveLength(21);
		for (const file of files) {
			const source = await fs.readFile(path.join(TEMPLATE_DIRECTORY, file), 'utf8');
			expect(() => generateCode(parseKUISkin(source))).not.toThrow();
		}
	});
});
