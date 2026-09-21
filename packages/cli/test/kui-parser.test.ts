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
	it('compiles canonical component tags, typed resources, inferred parts, and states', () => {
		const source = `<?xml version="1.0" encoding="utf-8"?>
<Skin xmlns="https://kurot.dev/ui/1" class="skins.ButtonSkin" states="down" minWidth="100">
	<Image source="button_up_png" width="100%" alpha.down="0.8" />
	<Label id="labelDisplay" text="Play" />
</Skin>
`;
		const ir = parseKUISkin(source);
		const generated = generateCode(ir);

		expect(ir.className).toBe('skins.ButtonSkin');
		expect(ir.skinParts).toEqual(['labelDisplay']);
		expect(generated).toContain('skin.minWidth = 100;');
		expect(generated).toContain('skin.elementsContent = [__kui_node_0_0, labelDisplay];');
		expect(generated).toContain('__kui_node_0_0.source = "button_up_png";');
		expect(generated).toContain('__kui_node_0_0.percentWidth = 100;');
		expect(generated).toContain('skin["labelDisplay"] = labelDisplay;');
		expect(generated).toContain('new State("down", [new SetProperty("__kui_node_0_0", "alpha", 0.8)])');
	});

	it('resolves project component namespaces without EUI aliases', () => {
		const source = `
<Skin xmlns="https://kurot.dev/ui/1" xmlns:game="https://kurot.dev/components/game"
	class="skins.HostSkin">
	<game:Badge id="badge" />
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
<Skin xmlns="https://kurot.dev/ui/1" class="skins.Invalid">
	<Buton id="broken" />
</Skin>`;
		const ir = parseKUISkin(source);

		expect(ir.unresolvedTags[0]).toMatchObject({ name: 'Buton' });
		expect(ir.children).toEqual([]);
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
