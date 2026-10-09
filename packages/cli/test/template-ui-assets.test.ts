import { readFile, readdir } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parseUIResourceConfigEntries, parseUIStyleSheet } from '@kurot/ui-document';
import { compileKUI, parseToIR } from '../src/core/kui/index.js';
import type { SkinNode } from '../src/core/kui/index.js';

const resourceRoot = new URL('../templates/game/resource/', import.meta.url);

interface Sheet {
	file: string;
	resolution: number;
	frames: Record<string, { x: number; y: number; w: number; h: number }>;
}

describe('native KUI default skin assets', () => {
	it('resolves every base/state texture and pairs scalable state surfaces with valid untrimmed grids', async () => {
		const sheet = JSON.parse(await readFile(new URL('assets/ui/kui/kui.json', resourceRoot), 'utf8')) as Sheet;
		const png = await readFile(new URL('assets/ui/kui/kui.png', resourceRoot));
		expect(sheet.file).toBe('kui.png');
		expect(sheet.resolution).toBe(2);
		expect(sheet.frames.checkbox_up).toMatchObject({ w: 56, h: 56 });
		expect(sheet.frames.button_up).toMatchObject({ w: 96, h: 96 });
		expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
		const width = png.readUInt32BE(16);
		const height = png.readUInt32BE(20);
		const resources = parseUIResourceConfigEntries(JSON.parse(await readFile(new URL('default.res.json', resourceRoot), 'utf8')));
		const atlas = resources.find(resource => resource.name === 'kui');
		expect(atlas?.subkeys).toBeDefined();
		expect(Object.keys(atlas!.subkeys!).sort()).toEqual(Object.keys(sheet.frames).sort());
		for (const [name, frame] of Object.entries(sheet.frames)) {
			expect(frame.x).toBeGreaterThanOrEqual(0);
			expect(frame.y).toBeGreaterThanOrEqual(0);
			expect(frame.x + frame.w).toBeLessThanOrEqual(width);
			expect(frame.y + frame.h).toBeLessThanOrEqual(height);
			const grid = atlas!.subkeys![name]?.scale9grid;
			if (typeof grid === 'string') {
				const [x, y, w, h] = grid.split(',').map(Number);
				expect(w).toBeGreaterThan(0);
				expect(h).toBeGreaterThan(0);
				expect(x + w).toBeLessThan(frame.w / sheet.resolution);
				expect(y + h).toBeLessThan(frame.h / sheet.resolution);
			}
		}
		const style = parseUIStyleSheet(JSON.parse(await readFile(new URL('config/style.json', resourceRoot), 'utf8')));
		const directory = new URL('ui/skins/', resourceRoot);
		for (const filename of await readdir(directory)) {
			const source = await readFile(new URL(filename, directory), 'utf8');
			expect(source).not.toMatch(/eui|_png/);
			const ir = parseToIR(source, undefined, [], resources, style.colors, style);
			expect(ir.unresolvedTags).toEqual([]);
			const assignments = nodes(ir.children).flatMap(node => node.properties).concat(ir.states.flatMap(state => state.overrides));
			for (const assignment of assignments.filter(property => property.name === 'source')) {
				const value = assignment.value.value;
				if (typeof value !== 'string') throw new Error(`Invalid texture in ${filename}`);
				expect(value.startsWith('kui.')).toBe(true);
				expect(sheet.frames[value.slice(4)], `${filename}: ${value}`).toBeDefined();
			}
			expect(() => compileKUI(source, undefined, { resources, styleSheet: style })).not.toThrow();
		}
		const button = parseToIR(await readFile(new URL('ButtonSkin.kui.xml', directory), 'utf8'), undefined, [], resources, style.colors, style);
		for (const state of button.states.filter(state => state.name === 'down' || state.name === 'disabled')) {
			expect(state.overrides.some(override => override.name === 'scale9Grid')).toBe(true);
		}
		await expect(readFile(new URL('assets/ui/eui/eui.json', resourceRoot))).rejects.toThrow();
	});

	it('keeps hidden scroll bars usable without switching scrolling off', async () => {
		const source = await readFile(new URL('ui/skins/ScrollerSkin.kui.xml', resourceRoot), 'utf8');
		const ir = parseToIR(source);
		for (const node of ir.children) {
			expect(node.properties.find(property => property.name === 'visible')?.value.value).toBe(false);
			expect(node.properties.find(property => property.name === 'autoVisibility')?.value.value).toBe(false);
		}
		expect(source).not.toContain('scrollPolicy');
	});
});

function nodes(children: readonly SkinNode[]): SkinNode[] {
	return children.flatMap(child => [child, ...nodes(child.children), ...child.propertyChildren.flatMap(property => nodes(property.nodes))]);
}
