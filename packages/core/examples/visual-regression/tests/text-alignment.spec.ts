import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type {} from '../TextAlignmentHarness.js';

let bundle: string;
let regular: Buffer;
let bold: Buffer;
test.beforeAll(async () => {
	const result = await build({
		entryPoints: [fileURLToPath(new URL('../TextAlignmentHarness.ts', import.meta.url))],
		bundle: true, write: false, minify: true, keepNames: false,
		format: 'iife', platform: 'browser', target: 'es2022',
	});
	bundle = result.outputFiles[0].text;
	const fonts = new URL('../../../../cli/templates/game/resource/assets/fonts/', import.meta.url);
	[regular, bold] = await Promise.all([
		readFile(new URL('ChakraPetch-Regular.ttf', fonts)),
		readFile(new URL('ChakraPetch-Bold.ttf', fonts)),
	]);
});

for (const backend of ['canvas', 'webgl1', 'webgl2'] as const) {
	for (const resolution of [1, 2]) {
		test(`${backend} ${resolution}x: unified top/middle/bottom and stable input geometry`, async ({ page }) => {
			const errors: string[] = [];
			page.on('pageerror', error => errors.push(error.message));
			if (backend === 'webgl1') {
				await page.addInitScript(() => {
					const original = HTMLCanvasElement.prototype.getContext;
					HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type, ...args) {
						return type === 'webgl2' ? null : original.call(this, type, ...args);
					} as typeof original;
				});
			}
			await page.route('http://text-alignment.test/**', route => {
				const path = new URL(route.request().url()).pathname;
				return path.endsWith('.ttf') ? route.fulfill({
					contentType: 'font/ttf', body: path.includes('Bold') ? bold : regular,
				}) : route.fulfill({ contentType: 'text/html', body: '<!doctype html><canvas></canvas>' });
			});
			await page.goto(`http://text-alignment.test/?backend=${backend}&resolution=${resolution}`);
			await page.evaluate(async () => {
				for (const [weight, file] of [['400', 'Regular'], ['700', 'Bold']]) {
					const face = await new FontFace('kurot-primary', `url(/ChakraPetch-${file}.ttf)`, { weight }).load();
					document.fonts.add(face);
				}
			});
			await page.addScriptTag({ content: bundle });
			const result = await page.evaluate(async () => {
				const { field, root, kurot, player, compare } = window.textAlignment;
				const checks: Record<string, Awaited<ReturnType<typeof compare>>> = {};
				if (field.verticalAlign !== 'middle') throw new Error('TextField must default to middle.');
				field.text = 'START GAME';
				checks.defaultSingle = await compare();
				field.multiline = true;
				field.text = 'START\nGAME';
				checks.defaultParagraph = await compare();
				const samples = ['开始游戏', 'START GAME', 'Start Game', 'play game', '5000.00x', 'Jouer',
					'Spiel starten', 'Jugar', 'Bắt đầu', 'Начать игру', 'Έναρξη', 'ゲーム開始', '게임 시작',
					'เริ่มเกม', 'ابدأ اللعبة', 'התחל משחק', 'खेल शुरू करें', ','];
				for (const alignment of ['top', 'middle', 'bottom'] as const) {
					field.verticalAlign = alignment;
					for (const multiline of [false, true]) {
						field.multiline = multiline;
						for (const bold of [false, true]) {
							field.bold = bold;
							for (const text of samples) {
								field.text = text;
								checks[`single-${alignment}-${multiline}-${bold}-${text}`] = await compare();
							}
						}
					}
				}
				field.verticalAlign = 'middle';
				field.textFlow = [{ text: 'START ', style: { size: 30 } }, { text: 'play', style: { size: 14 } }];
				checks.rich = await compare();
				field.stroke = 2;
				checks.outlined = await compare();
				field.cacheAsTexture(true);
				checks.cached = await compare();
				field.cacheAsTexture(false);
				root.cacheAsTexture(true);
				checks.cachedParent = await compare();
				root.cacheAsTexture(false);
				field.stroke = 0;
				field.multiline = true;
				field.lineSpacing = 4;
				field.text = 'START\nplay';
				const paragraphBaseline = field.getLinesArr().map(line => line.baseline);
				checks.paragraph = await compare();
				field.text = 'เริ่มเกม\n开始游戏';
				const changedParagraph = field.getLinesArr().map(line => line.baseline);
				checks.changedParagraph = await compare();
				root.cacheAsTexture(true);
				checks.cachedParagraph = await compare();
				root.cacheAsTexture(false);
				field.height = 80;
				field.textFlow = [{ text: 'START\n', style: { size: 30 } }, { text: 'play', style: { size: 14 } }];
				checks.richParagraph = await compare();
				field.stroke = 2;
				root.cacheAsTexture(true);
				checks.cachedRichParagraph = await compare();
				root.cacheAsTexture(false);
				field.stroke = 0;
				field.text = '\nSTART\n';
				checks.blankRows = await compare();
				field.width = 70;
				field.wordWrap = true;
				field.text = 'START START';
				checks.wrapped = await compare();
				const wrappedLines = field.numLines;
				field.width = 240;
				field.height = NaN;
				field.text = 'Label';
				for (const alignment of ['top', 'middle', 'bottom'] as const) {
					field.verticalAlign = alignment;
					for (const size of [24, 40, 56]) {
						field.size = size;
						for (const multiline of [false, true]) {
							field.multiline = multiline;
							checks[`automatic-${alignment}-${size}-${multiline}`] = await compare();
						}
					}
				}
				field.size = 18;
				field.multiline = true;
				field.height = 80;
				for (const alignment of ['top', 'middle', 'bottom'] as const) {
					field.verticalAlign = alignment;
					field.text = 'START\nplay';
					checks[`paragraph-${alignment}`] = await compare();
					field.text = '\nSTART\n';
					checks[`blank-${alignment}`] = await compare();
					field.textFlow = [{ text: 'START\n', style: { size: 30 } }, { text: 'play', style: { size: 14 } }];
					checks[`rich-paragraph-${alignment}`] = await compare();
					root.cacheAsTexture(true);
					checks[`cached-rich-${alignment}`] = await compare();
					root.cacheAsTexture(false);
					field.text = 'START START';
					field.width = 70;
					checks[`wrap-${alignment}`] = await compare();
					field.width = 240;
					field.multiline = false;
					field.text = 'START';
					field.height = 10;
					field.scrollRect = new kurot.Rectangle(0, 0, field.width, field.height);
					checks[`overflow-${alignment}`] = await compare(true);
					field.scrollRect = undefined;
					field.height = 80;
					field.multiline = true;
				}
				field.verticalAlign = 'middle';
				field.multiline = false;
				field.height = NaN;
				for (const text of ['เริ่มเกม', 'खेल शुरू करें']) {
					field.text = text;
					checks[`tight-${text}`] = await compare();
					root.cacheAsTexture(true);
					checks[`tight-cache-${text}`] = await compare();
					root.cacheAsTexture(false);
				}
				field.type = kurot.TextFieldType.INPUT;
				const inputBaselines: number[][] = [];
				const changedInputs: number[][] = [];
				const clickIndices: number[] = [];
				for (const alignment of ['top', 'middle', 'bottom'] as const) {
					field.verticalAlign = alignment;
					for (const multiline of [false, true]) {
						field.setIsTyping(false);
						field.multiline = multiline;
						field.height = multiline ? 80 : 48;
						field.text = multiline ? 'START\nplay' : 'START';
						inputBaselines.push(field.getLinesArr().map(line => line.baseline));
						checks[`input-${alignment}-${multiline}`] = await compare();
						field.text = multiline ? 'start\nPLAY' : 'start';
						changedInputs.push(field.getLinesArr().map(line => line.baseline));
						field.setIsTyping(true);
						field.$setCaretVisible(true);
						const start = multiline ? 6 : 1;
						field.setSelection(start, start);
						checks[`caret-${alignment}-${multiline}`] = await compare();
						field.setSelection(start, start + 3);
						checks[`selection-${alignment}-${multiline}`] = await compare();
						field.$setCompositionRange(start, start + 3);
						checks[`composition-${alignment}-${multiline}`] = await compare();
						field.$setCompositionRange();
						const factor = alignment === 'top' ? 0 : alignment === 'middle' ? 0.5 : 1;
						const row = field.getLinesArr()[multiline ? 1 : 0];
						clickIndices.push(field.$getInputIndexAt((field.width - row.width) / 2,
							(field.height - field.textHeight) * factor + (multiline ? field.size + field.lineSpacing : 0)
							+ field.size / 2));
					}
				}
				return { webgl: player.isWebGL, checks, paragraphBaseline, changedParagraph,
					inputBaselines, changedInputs, wrappedLines, clickIndices };
			});
			expect(result.webgl).toBe(backend !== 'canvas');
			expect(result.changedParagraph).toEqual(result.paragraphBaseline);
			expect(result.changedInputs).toEqual(result.inputBaselines);
			expect(result.wrappedLines).toBe(2);
			expect(result.clickIndices).toEqual([0, 6, 0, 6, 0, 6]);
			for (const [name, pixels] of Object.entries(result.checks)) {
				expect(pixels.mismatches, `${name}: ${JSON.stringify(pixels)}`).toBe(0);
				expect(pixels.inkPixels, name).toBeGreaterThan(0);
				if (name.startsWith('single-middle-') || name === 'rich' || name === 'paragraph'
					|| name === 'changedParagraph' || name === 'cachedParagraph') {
					expect(Math.abs(pixels.inkCenter - 24), `${name}: ${JSON.stringify(pixels)}`).toBeLessThanOrEqual(1);
				}
				if (name === 'richParagraph' || name === 'cachedRichParagraph' || name === 'wrapped') {
					expect(Math.abs(pixels.inkCenter - 40), `${name}: ${JSON.stringify(pixels)}`).toBeLessThanOrEqual(1);
				}
				if (name.startsWith('automatic-')) {
					const [, alignment, size] = name.split('-');
					const edge = alignment === 'top' ? pixels.inkTop : alignment === 'bottom' ? pixels.inkBottom : pixels.inkCenter;
					const expected = alignment === 'top' ? 0 : alignment === 'bottom' ? Number(size) : Number(size) / 2;
					expect(Math.abs(edge - expected), `${name}: ${JSON.stringify(pixels)}`).toBeLessThanOrEqual(1);
				}
				if (name.startsWith('single-top-') || name.startsWith('single-bottom-')) {
					const edge = name.startsWith('single-top-') ? pixels.inkTop : pixels.inkBottom - 48;
					expect(Math.abs(edge), `${name}: ${JSON.stringify(pixels)}`).toBeLessThanOrEqual(1);
				}
			}
			expect(errors).toEqual([]);
		});
	}
}
