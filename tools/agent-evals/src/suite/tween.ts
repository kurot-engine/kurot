import { expect, inputListeners, named, runScenarios, state } from './browser-tools.js';
import type { Page } from './browser-tools.js';
import type { Check } from '../comparison/types.js';

async function inspect(handle: Awaited<ReturnType<typeof named>>): Promise<{ x: number; count: number }> {
	return handle.evaluate(async target => {
			const id = '@kurot/game'; const module: unknown = await import(id);
			const { Tween } = module as { Tween: { getCount(target: object): number } };
			return { x: target.x, count: Tween.getCount(target) };
	});
}

async function runner(page: Page): Promise<{ x: number; count: number }> {
	const handle = await named(page, 'runner');
	try {
		return await inspect(handle);
	} finally { await handle.dispose(); }
}

export async function tweenChecks(directory: string, artifacts: string): Promise<Check[]> {
	return runScenarios(directory, artifacts, [
		{ id: 'interpolate-pause', clock: true, run: async page => {
			await state(page, 'ready', 0); await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
			await page.locator('#start').click(); await page.clock.runFor(400);
			const moving = await runner(page);
			expect(moving.x).toBeGreaterThan(290); expect(moving.x).toBeLessThan(330); expect(moving.count).toBe(1);
			await page.locator('#pause').click(); await state(page, 'paused', 0);
			const paused = await runner(page); await page.clock.runFor(2000);
			expect((await runner(page)).x).toBe(paused.x);
			await page.locator('#pause').click(); await state(page, 'playing', 0);
			await page.clock.runFor(500); await state(page, 'playing', 1);
		} },
		{ id: 'cancel-restart', clock: true, mobile: true, run: async page => {
			await state(page, 'ready', 0); await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
			await page.locator('#start').click(); await page.clock.runFor(350);
			const listeners = await inputListeners(page);
			for (let i = 0; i < 4; i++) {
				await page.locator('#restart').click(); await state(page, 'playing', 0);
				await page.clock.runFor(32);
				expect((await runner(page)).count).toBe(1); expect(await inputListeners(page)).toBe(listeners);
			}
			await page.clock.runFor(450); await state(page, 'playing', 0);
			await page.clock.runFor(450); await state(page, 'playing', 1);
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
			const closing = await named(page, 'runner');
			await page.locator('#close').click(); await state(page, 'disposed');
			expect((await inspect(closing)).count).toBe(0); await closing.dispose(); expect(await inputListeners(page)).toBe(0);
			const final = await page.locator('#status').evaluate(element => element.outerHTML);
			await page.clock.runFor(5000);
			expect(await page.locator('#status').evaluate(element => element.outerHTML)).toBe(final);
		} },
		{ id: 'end-cleanup', clock: true, run: async page => {
			await state(page, 'ready', 0); await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
			await page.locator('#start').click(); await page.clock.runFor(2600); await state(page, 'ended', 3);
			expect(await runner(page)).toEqual({ x: 520, count: 0 });
			await page.locator('#restart').click(); await page.clock.runFor(100);
			const closing = await named(page, 'runner');
			await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
			await state(page, 'disposed'); expect((await inspect(closing)).count).toBe(0); await closing.dispose();
		} },
	]);
}
