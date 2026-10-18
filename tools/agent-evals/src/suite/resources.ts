import { expect, inputListeners, named, runScenarios, state, tap } from './browser-tools.js';
import type { Page } from './browser-tools.js';
import type { Check } from '../comparison/types.js';

async function cached(page: Page): Promise<boolean> {
	return page.evaluate(async () => {
		const id = '@kurot/core';
		const module: unknown = await import(id);
		const { resource } = module as { resource: { hasRes(name: string): boolean } };
		return resource.hasRes('gem') || resource.hasRes('rules');
	});
}

export async function resourceChecks(directory: string, artifacts: string): Promise<Check[]> {
	return runScenarios(directory, artifacts, [
		{ id: 'load-play', mobile: true, run: async page => {
			await state(page, 'ready', 0);
			let rulesRequests = 0;
			await page.route('**/resource/assets/rules.json', async route => {
				rulesRequests++;
				await route.fulfill({ json: { points: 7, goal: 14 } });
			});
			await page.locator('#start').click();
			await state(page, 'playing', 0);
			await expect(page.locator('#status')).toHaveAttribute('data-loaded', '2');
			await expect(page.locator('#status')).toHaveAttribute('data-total', '2');
			expect(rulesRequests).toBeGreaterThan(0);
			const gem = await named(page, 'gem');
			expect(await gem.evaluate(async object => {
				const id = '@kurot/core'; const module: unknown = await import(id);
				const { Bitmap } = module as { Bitmap: new () => object };
				return object instanceof Bitmap;
			})).toBe(true);
			await tap(page, 320, 360); await state(page, 'playing', 7);
			await tap(page, 320, 360); await state(page, 'ended', 14);
			await tap(page, 320, 360); await state(page, 'ended', 14);
			const count = await inputListeners(page);
			for (let i = 0; i < 3; i++) {
				await page.locator('#restart').click(); await state(page, 'playing', 0);
				expect(await inputListeners(page)).toBe(count);
				await tap(page, 320, 360); await state(page, 'playing', 7);
				await tap(page, 320, 360); await state(page, 'ended', 14);
			}
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
			await page.locator('#close').click(); await state(page, 'disposed');
			expect(await cached(page)).toBe(false);
			expect(await inputListeners(page)).toBe(0);
		} },
		{ id: 'error-retry', run: async page => {
			await state(page, 'ready', 0);
			let failing = true;
			await page.route('**/resource/assets/rules.json', route => failing ? route.fulfill({ status: 503, body: 'Controlled fixture failure' }) : route.continue());
			await page.locator('#start').click(); await state(page, 'error', 0);
			await expect(page.locator('#retry')).toBeEnabled();
			failing = false;
			await page.locator('#retry').click(); await state(page, 'playing', 0);
			await tap(page, 320, 360); await state(page, 'playing', 5);
			await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
			await state(page, 'disposed'); expect(await cached(page)).toBe(false);
		} },
		{ id: 'pending-dispose', run: async page => {
			await state(page, 'ready', 0);
			let release: (() => void) | undefined;
			const gate = new Promise<void>(resolve => { release = resolve; });
			await page.route('**/resource/assets/rules.json', async route => { await gate; await route.continue(); });
			const request = page.waitForRequest('**/resource/assets/rules.json');
			await page.locator('#start').click(); await request;
			await state(page, 'loading', 0);
			await page.locator('#close').click(); await state(page, 'disposed');
			const final = await page.locator('#status').evaluate(element => element.outerHTML);
			release?.(); await page.waitForTimeout(250);
			expect(await page.locator('#status').evaluate(element => element.outerHTML)).toBe(final);
			expect(await cached(page)).toBe(false);
			await expect(page.locator('#start')).toBeDisabled();
		} },
	]);
}
