import { expect, test } from '@playwright/test';

test('captures and exports a device evidence record', async ({ page }) => {
	await page.goto('http://127.0.0.1:4173/benchmark/device-matrix/');
	await expect(page.locator('#status')).toHaveText('Ready');
	await expect(page.locator('#webgl2')).toContainText('Supported');
	await expect(page.locator('#webgl1')).toContainText('Renderer');
	await page.locator('#release').fill('test-release');
	await page.locator('#device').fill('playwright-device');
	await page.locator('#visual').check();
	const downloadPromise = page.waitForEvent('download');
	await page.locator('#download').click();
	const download = await downloadPromise;
	const stream = await download.createReadStream();
	const chunks: Buffer[] = [];
	for await (const chunk of stream) chunks.push(Buffer.from(chunk));
	const record = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
		schemaVersion: number;
		release: string;
		device: string;
		checks: { visual: boolean };
		webgl1: { supported: boolean };
	};
	expect(record).toMatchObject({
		schemaVersion: 1,
		release: 'test-release',
		device: 'playwright-device',
		checks: { visual: true },
		webgl1: { supported: true },
	});
});
