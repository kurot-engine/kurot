import { expect, inputListeners, named, requests, runScenarios, state, tap } from './browser-tools.js';
import type { Page } from './browser-tools.js';
import type { Check } from '../comparison/types.js';

async function question(page: Page, value: number): Promise<void> {
	await expect(page.locator('#status')).toHaveAttribute('data-question', String(value));
}

async function nativeParts(page: Page): Promise<boolean> {
	const panel = await named(page, 'quiz');
	try {
		return await panel.evaluate(async object => {
			const id = '@kurot/ui'; const module: unknown = await import(id);
			const { Button, Label } = module as { Button: new () => object; Label: new () => object };
			const { skinParts } = object as unknown as { skinParts: Record<string, object> };
			return ['start', 'left', 'right', 'restart'].every(key => skinParts[key] instanceof Button) &&
				['scoreLabel', 'promptLabel'].every(key => skinParts[key] instanceof Label);
		});
	} finally { await panel.dispose(); }
}

export async function kuiChecks(directory: string, artifacts: string): Promise<Check[]> {
	return runScenarios(directory, artifacts, [
		{ id: 'skin-runtime', run: async page => {
			await state(page, 'ready', 0); await question(page, 0);
			expect(requests(page).some(url => new URL(url).pathname === '/resource/default.thm.json')).toBe(true);
			expect(requests(page).some(url => new URL(url).pathname === '/js/default.thm.js')).toBe(true);
			expect(await nativeParts(page)).toBe(true);
			await tap(page, 180, 380); await state(page, 'ready', 0); await question(page, 0);
			await tap(page, 320, 212); await state(page, 'playing', 0);
			await tap(page, 180, 380); await state(page, 'playing', 10); await question(page, 1);
		} },
		{ id: 'quiz-round', run: async page => {
			await state(page, 'ready', 0); await tap(page, 320, 212);
			await tap(page, 180, 380); await question(page, 1); await state(page, 'playing', 10);
			await tap(page, 180, 380); await question(page, 2); await state(page, 'playing', 10);
			await tap(page, 180, 380); await question(page, 3); await state(page, 'ended', 20);
			await tap(page, 460, 380); await state(page, 'ended', 20); await question(page, 3);
			const count = await inputListeners(page);
			for (let i = 0; i < 4; i++) {
				await tap(page, 320, 592); await state(page, 'playing', 0); await question(page, 0);
				await tap(page, 180, 380); await state(page, 'playing', 10); await question(page, 1);
				expect(await inputListeners(page)).toBe(count);
			}
			await page.locator('#close').click(); await state(page, 'disposed');
			expect(await inputListeners(page)).toBe(0);
			const final = await page.locator('#status').evaluate(element => element.outerHTML);
			await tap(page, 320, 592); await tap(page, 180, 380);
			expect(await page.locator('#status').evaluate(element => element.outerHTML)).toBe(final);
		} },
		{ id: 'mobile-dispose', mobile: true, run: async page => {
			await state(page, 'ready', 0); expect(await nativeParts(page)).toBe(true);
			await tap(page, 320, 212); await tap(page, 180, 380); await tap(page, 460, 380); await tap(page, 180, 380);
			await state(page, 'ended', 30); await question(page, 3);
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
			await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
			await state(page, 'disposed'); expect(await inputListeners(page)).toBe(0);
		} },
	]);
}
