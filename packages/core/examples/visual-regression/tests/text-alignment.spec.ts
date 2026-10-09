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
		test(`${backend} ${resolution}x: multilingual ink centers and stable input/paragraph baselines`, async ({ page }) => {
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
				const samples = ['开始游戏', 'START GAME', 'Start Game', 'play game', '5000.00x', 'Jouer',
					'Spiel starten', 'Jugar', 'Bắt đầu', 'Начать игру', 'Έναρξη', 'ゲーム開始', '게임 시작',
					'เริ่มเกม', 'ابدأ اللعبة', 'התחל משחק', 'खेल शुरू करें', ','];
				for (const bold of [false, true]) {
					field.bold = bold;
					for (const text of samples) {
						field.text = text;
						checks[`${bold}-${text}`] = await compare();
					}
				}
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
				field.multiline = false;
				field.height = NaN;
				for (const text of ['เริ่มเกม', 'खेल शुरू करें']) {
					field.text = text;
					checks[`tight-${text}`] = await compare();
					root.cacheAsTexture(true);
					checks[`tight-cache-${text}`] = await compare();
					root.cacheAsTexture(false);
				}
				field.height = 48;
				field.type = kurot.TextFieldType.INPUT;
				field.text = 'START';
				const inputBaseline = field.getLinesArr()[0].baseline;
				checks.input = await compare();
				field.text = 'play';
				const changedInput = field.getLinesArr()[0].baseline;
				checks.changedInput = await compare();
				return { webgl: player.isWebGL, checks, paragraphBaseline, changedParagraph, inputBaseline, changedInput };
			});
			expect(result.webgl).toBe(backend !== 'canvas');
			expect(result.changedParagraph).toEqual(result.paragraphBaseline);
			expect(result.changedInput).toBe(result.inputBaseline);
			for (const [name, pixels] of Object.entries(result.checks)) {
				expect(pixels.mismatches, `${name}: ${JSON.stringify(pixels)}`).toBe(0);
				expect(pixels.inkPixels, name).toBeGreaterThan(0);
				if (name.startsWith('true-') || name.startsWith('false-') || name === 'rich') {
					expect(Math.abs(pixels.inkCenter - 24), `${name}: ${JSON.stringify(pixels)}`).toBeLessThanOrEqual(1);
				}
			}
			expect(errors).toEqual([]);
		});
	}
}
