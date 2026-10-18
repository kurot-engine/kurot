import playwright from '../../../../examples/star-catcher/node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/test.js';
import type { JSHandle, Page } from '../../../../examples/star-catcher/node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/test.js';
import path from 'node:path';
import { serve } from '../comparison/server.js';
import type { Check } from '../comparison/types.js';
import type { DisplayProbe } from './types.js';

type BrowserLibrary = typeof import('../../../../examples/star-catcher/node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/test.js');
const browserLibrary = playwright as unknown as BrowserLibrary;
const chromium = browserLibrary.chromium;
export const expect: BrowserLibrary['expect'] = browserLibrary.expect;
export type { Page };
const pageRequests = new WeakMap<Page, string[]>();

export function requests(page: Page): readonly string[] {
	return pageRequests.get(page) ?? [];
}

export interface Scenario {
	readonly id: string;
	readonly mobile?: boolean;
	readonly clock?: boolean;
	run(page: Page): Promise<void>;
}

export async function state(page: Page, phase: string, score?: number): Promise<void> {
	await expect(page.locator('output#status')).toHaveAttribute('data-phase', phase, { timeout: 4000 });
	if (score !== undefined) { await expect(page.locator('#status')).toHaveAttribute('data-score', `${score}`); }
}

export async function tap(page: Page, x: number, y: number): Promise<void> {
	const bounds = await page.locator('#gameCanvas').boundingBox();
	if (!bounds) throw new Error('Missing canvas bounds.');
	await page.touchscreen.tap(bounds.x + x / 640 * bounds.width, bounds.y + y / 800 * bounds.height);
}

export async function named(page: Page, name: string): Promise<JSHandle<DisplayProbe>> {
	return page.evaluateHandle(async value => {
		const url = '/Main.js';
		const entry: unknown = await import(url);
		const { app } = entry as { app: { stage: DisplayProbe } };
		const pending = [app.stage];
		while (pending.length > 0) {
			const object = pending.pop();
			if (!object) continue;
			if (object.name === value) return object;
			for (let i = 0; i < (object.numChildren ?? 0); i++) {
				const child = object.getChildAt?.(i);
				if (child) { pending.push(child); }
			}
		}
		throw new Error(`Missing real display object named ${value}.`);
	}, name);
}

export async function inputListeners(page: Page): Promise<number> {
	const cdp = await page.context().newCDPSession(page);
	try {
		const scripts = new Map<string, string>();
		cdp.on('Debugger.scriptParsed', script => scripts.set(script.scriptId, script.url));
		await cdp.send('Debugger.enable');
		let count = 0;
		for (const expression of ['window', 'document', 'document.querySelector("canvas")']) {
			const { result } = await cdp.send('Runtime.evaluate', { expression });
			if (!result.objectId) continue;
			const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
			count += listeners.filter(listener => (scripts.get(listener.scriptId)?.startsWith(new URL(page.url()).origin) ?? false) &&
				['keydown', 'keyup', 'blur', 'pagehide', 'pointerdown', 'touchstart', 'mousedown'].includes(listener.type)).length;
		}
		return count;
	} finally { await cdp.detach(); }
}

export async function runScenarios(directory: string, artifacts: string, scenarios: readonly Scenario[]): Promise<Check[]> {
	const server = await serve(path.join(directory, 'bin-debug'));
	const browser = await chromium.launch({ headless: true });
	const checks: Check[] = [];
	try {
		for (const scenario of scenarios) {
			const context = await browser.newContext({ viewport: { width: scenario.mobile ? 360 : 960, height: 1000 }, hasTouch: true });
			const page = await context.newPage();
			const urls: string[] = [];
			pageRequests.set(page, urls);
			page.setDefaultTimeout(3000);
			const errors: string[] = [];
			page.on('pageerror', error => errors.push(error.message));
			page.on('console', message => {
				// A handled, deliberately injected load failure may be logged by the app.
				if (message.type() === 'error' && scenario.id !== 'error-retry') { errors.push(message.text()); }
			});
			page.on('response', response => {
				const expected = scenario.id === 'error-retry' && response.status() === 503 && new URL(response.url()).pathname === '/resource/assets/rules.json';
				if (response.status() >= 400 && !expected) { errors.push(`HTTP ${response.status()} ${response.url()}`); }
			});
			page.on('request', request => {
				urls.push(request.url());
				if (/^https?:/.test(request.url()) && !request.url().startsWith(server.url)) { errors.push(`External request ${request.url()}`); }
			});
			await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
			try {
				if (scenario.clock) { await page.clock.install({ time: new Date('2026-10-18T01:00:00Z') }); }
				await page.goto(server.url);
				let timer: ReturnType<typeof setTimeout> | undefined;
				try {
					await Promise.race([scenario.run(page), new Promise<never>((_, reject) => {
						timer = setTimeout(() => reject(new Error(`Scenario ${scenario.id} exceeded 30 seconds.`)), 30000);
					})]);
				} finally { clearTimeout(timer); }
				await page.screenshot({ path: path.join(artifacts, `${scenario.id}-result.png`), fullPage: true });
				expect(errors).toEqual([]);
				checks.push({ id: scenario.id, passed: true, detail: 'Browser behavior, real SDK objects and console/network checks passed.' });
			} catch (error) {
				await page.screenshot({ path: path.join(artifacts, `${scenario.id}-failure.png`), fullPage: true }).catch(() => undefined);
				checks.push({ id: scenario.id, passed: false, detail: `${String(error)}\n${errors.join('\n')}` });
			} finally {
				await context.tracing.stop({ path: path.join(artifacts, `${scenario.id}-trace.zip`) });
				await context.close();
			}
		}
	} finally { await browser.close(); await server.close(); }
	return checks;
}
