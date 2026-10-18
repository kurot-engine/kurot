import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.use({ viewport: { width: 960, height: 1000 }, hasTouch: true, deviceScaleFactor: 2 });
const browserErrors = new WeakMap<Page, string[]>();

async function playerX(page: Page): Promise<number> {
	return Number(await page.locator('#game-status').getAttribute('data-player-x'));
}

async function listeners(page: Page): Promise<number> {
	const cdp = await page.context().newCDPSession(page);
	try {
		const { result } = await cdp.send('Runtime.evaluate', { expression: 'window' });
		if (!result.objectId) throw new Error('Missing window object.');
		const data = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
		return data.listeners.filter(entry => ['keydown', 'keyup', 'blur', 'pagehide'].includes(entry.type)).length;
	} finally {
		await cdp.detach();
	}
}

test.beforeEach(async ({ page }) => {
	const errors: string[] = [];
	browserErrors.set(page, errors);
	page.on('pageerror', error => errors.push(error.message));
	page.on('console', message => {
		if (message.type() === 'error') errors.push(message.text());
	});
	page.on('response', response => {
		if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
	});
	await page.clock.install({ time: new Date('2026-10-18T00:00:00Z') });
	await page.goto(process.env.GAME_URL ?? 'http://127.0.0.1:3000');
	await expect(page.locator('#game-status')).toHaveAttribute('data-phase', 'ready');
	await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
});

test.afterEach(async ({ page }, info) => {
	if (info.status !== info.expectedStatus) {
		await page.screenshot({ path: info.outputPath('failure.png') });
	}
	expect(browserErrors.get(page)).toEqual([]);
});

test('keyboard and touch input score a star, pause safely and resume without stuck movement', async ({ page }, info) => {
	await page.screenshot({ path: info.outputPath('ready.png'), fullPage: true });
	await page.getByRole('button', { name: 'Start', exact: true }).click();
	await page.keyboard.down('ArrowLeft');
	await page.clock.runFor(300);
	await page.keyboard.up('ArrowLeft');
	expect(await playerX(page)).toBeLessThan(240);
	const bounds = await page.locator('canvas').boundingBox();
	if (!bounds) throw new Error('Missing playfield.');
	await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height * .7);
	await expect.poll(() => playerX(page)).toBeCloseTo(320, 0);
	await page.clock.runFor(2400);
	await expect(page.locator('#game-status')).toHaveAttribute('data-score', '10');
	await page.screenshot({ path: info.outputPath('playing.png'), fullPage: true });
	await page.keyboard.down('ArrowRight');
	await page.evaluate(() => window.dispatchEvent(new Event('blur')));
	await expect(page.locator('#game-status')).toHaveAttribute('data-phase', 'paused');
	const pausedX = await playerX(page);
	await page.clock.runFor(10000);
	expect(await playerX(page)).toBe(pausedX);
	await page.getByRole('button', { name: 'Resume' }).click();
	await page.clock.runFor(300);
	await page.keyboard.up('ArrowRight');
	expect(await playerX(page)).toBe(pausedX);
});

test('three misses end the round; repeated restart resets score/lives without accumulating listeners', async ({ page }) => {
	await page.getByRole('button', { name: 'Start', exact: true }).click();
	const playingListeners = await listeners(page);
	await page.keyboard.down('ArrowLeft');
	await page.clock.runFor(1000);
	await page.keyboard.up('ArrowLeft');
	await page.clock.runFor(9000);
	await expect(page.locator('#game-status')).toHaveAttribute('data-phase', 'ended');
	await expect(page.locator('#game-status')).toHaveAttribute('data-lives', '0');
	for (let i = 0; i < 4; i++) {
		await page.getByRole('button', { name: 'Restart', exact: true }).click();
		await expect(page.locator('#game-status')).toHaveAttribute('data-score', '0');
		await expect(page.locator('#game-status')).toHaveAttribute('data-lives', '3');
		expect(await listeners(page)).toBe(playingListeners);
	}
	await page.getByRole('button', { name: 'Close', exact: true }).click();
	await expect(page.locator('#game-status')).toHaveAttribute('data-phase', 'disposed');
	await expect(page.getByText('Thanks for catching.')).toBeVisible();
	expect(await listeners(page)).toBe(0);
	const closedText = await page.locator('#game-status').textContent();
	await page.clock.runFor(10000);
	await page.keyboard.press('ArrowLeft');
	await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeDisabled();
	await expect(page.locator('#game-status')).toHaveAttribute('data-phase', 'disposed');
	expect(await page.locator('#game-status').textContent()).toBe(closedText);
});

test('fits a narrow viewport and tears down on page exit', async ({ page }, info) => {
	await page.setViewportSize({ width: 360, height: 800 });
	// Resizing clears the canvas backing store; let the controlled clock render it.
	await page.clock.runFor(64);
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
	expect(overflow).toBe(false);
	await page.screenshot({ path: info.outputPath('mobile.png'), fullPage: true });
	await page.getByRole('button', { name: 'Start', exact: true }).click();
	const bounds = await page.locator('canvas').boundingBox();
	if (!bounds) throw new Error('Missing narrow playfield.');
	await page.touchscreen.tap(bounds.x + bounds.width * .75, bounds.y + bounds.height * .7);
	await expect.poll(() => playerX(page)).toBeCloseTo(480, 0);
	await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
	await expect(page.locator('#game-status')).toHaveAttribute('data-phase', 'disposed');
	expect(await listeners(page)).toBe(0);
});
