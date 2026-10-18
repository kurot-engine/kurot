// Reuse the reference project's frozen browser tools without another install.
import playwright from '../../../../examples/star-catcher/node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/test.js';
import type { Page } from '../../../../examples/star-catcher/node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/test.js';
import type { Check } from './types.js';
import { serve } from './server.js';
import path from 'node:path';

// The CJS entry computes its exports; Node only exposes its default binding.
const { chromium, expect } = playwright as unknown as typeof import('../../../../examples/star-catcher/node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/test.js');

async function inputListeners(page: Page): Promise<number> {
	const session = await page.context().newCDPSession(page);
	try {
		let count = 0;
		for (const expression of ['window', 'document', 'document.querySelector("canvas")']) {
			const { result } = await session.send('Runtime.evaluate', { expression });
			if (!result.objectId) continue;
			const { listeners } = await session.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
			count += listeners.filter(listener => ['keydown', 'keyup', 'blur', 'pagehide'].includes(listener.type)).length;
		}
		return count;
	} finally {
		await session.detach();
	}
}

async function state(page: Page, phase: string, score?: number, lives?: number): Promise<void> {
	await expect(page.locator('output#status')).toHaveAttribute('data-phase', phase, { timeout: 1500 });
	if (score !== undefined) await expect(page.locator('#status')).toHaveAttribute('data-score', `${score}`);
	if (lives !== undefined) await expect(page.locator('#status')).toHaveAttribute('data-lives', `${lives}`);
}

export async function browserChecks(directory: string, artifacts: string): Promise<Check[]> {
	const server = await serve(path.join(directory, 'bin-debug'));
	const browser = await chromium.launch({ headless: true });
	const checks: Check[] = [];
	try {
		for (const scenario of ['input-score', 'end-restart', 'cleanup-mobile']) {
			const context = await browser.newContext({ viewport: { width: scenario === 'cleanup-mobile' ? 360 : 960, height: 1000 }, hasTouch: true });
			const page = await context.newPage();
			page.setDefaultTimeout(3000);
			const errors: string[] = [];
			page.on('pageerror', error => errors.push(error.message));
			page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
			page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
			await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
			try {
				await page.clock.install({ time: new Date('2026-10-18T00:00:00Z') });
				await page.goto(server.url);
				await state(page, 'ready', 0, 3);
				await expect(page.locator('canvas#gameCanvas')).toBeVisible();
				await page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));
				await page.screenshot({ path: path.join(artifacts, `${scenario}-ready.png`), fullPage: true });
				await page.locator('#start').click();
				await state(page, 'playing', 0, 3);
				if (scenario === 'input-score') {
					await page.keyboard.press('ArrowLeft');
					await expect(page.locator('#status')).toHaveAttribute('data-lane', '0');
					await page.keyboard.press('d');
					await expect(page.locator('#status')).toHaveAttribute('data-lane', '1');
					const bounds = await page.locator('canvas').boundingBox();
					if (!bounds) throw new Error('Canvas bounds missing.');
					await page.touchscreen.tap(bounds.x + bounds.width * .85, bounds.y + bounds.height * .8);
					await expect(page.locator('#status')).toHaveAttribute('data-lane', '2');
					await page.touchscreen.tap(bounds.x + bounds.width * .5, bounds.y + bounds.height * .8);
					await expect(page.locator('#status')).toHaveAttribute('data-lane', '1');
					await page.clock.runFor(2100);
					await state(page, 'playing', 1, 3);
				} else if (scenario === 'end-restart') {
					const listeners = await inputListeners(page);
					await page.clock.runFor(20000);
					await state(page, 'ended', 2, 0);
					await page.keyboard.press('ArrowLeft');
					await page.clock.runFor(4000);
					await state(page, 'ended', 2, 0);
					await expect(page.locator('#status')).toHaveAttribute('data-lane', '1');
					for (let i = 0; i < 4; i++) {
						await page.locator('#restart').click();
						await state(page, 'playing', 0, 3);
						expect(await inputListeners(page)).toBe(listeners);
					}
					// One key must cause one lane change even after repeated restart.
					await page.keyboard.press('ArrowRight');
					await expect(page.locator('#status')).toHaveAttribute('data-lane', '2');
					await page.locator('#close').click();
					await state(page, 'disposed');
					expect(await inputListeners(page)).toBe(0);
					const final = await page.locator('#status').evaluate(element => element.outerHTML);
					await page.clock.runFor(10000);
					await page.keyboard.press('ArrowLeft');
					await expect(page.locator('#restart')).toBeDisabled();
					expect(await page.locator('#status').evaluate(element => element.outerHTML)).toBe(final);
				} else {
					await page.clock.runFor(64);
					expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
					const bounds = await page.locator('canvas').boundingBox();
					if (!bounds) throw new Error('Mobile canvas missing.');
					await page.touchscreen.tap(bounds.x + bounds.width * .85, bounds.y + bounds.height * .8);
					await expect(page.locator('#status')).toHaveAttribute('data-lane', '2');
					await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
					await state(page, 'disposed');
					expect(await inputListeners(page)).toBe(0);
				}
				await page.screenshot({ path: path.join(artifacts, `${scenario}-result.png`), fullPage: true });
				expect(errors).toEqual([]);
				checks.push({ id: scenario, passed: true, detail: 'Deterministic browser scenario passed; no browser/HTTP errors.' });
			} catch (error) {
				await page.screenshot({ path: path.join(artifacts, `${scenario}-failure.png`), fullPage: true }).catch(() => undefined);
				checks.push({ id: scenario, passed: false, detail: `${error instanceof Error ? error.message : String(error)}\n${errors.join('\n')}` });
			} finally {
				await context.tracing.stop({ path: path.join(artifacts, `${scenario}-trace.zip`) });
				await context.close();
			}
		}
	} finally {
		await browser.close();
		await server.close();
	}
	return checks;
}
