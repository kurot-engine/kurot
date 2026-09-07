import { expect, test } from '@playwright/test';

for (const backend of ['webgl1', 'webgl2']) {
	test(`${backend}: filter lab previews and measures the fixed workloads`, async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', error => errors.push(error.message));
		await page.goto(`http://127.0.0.1:4174/benchmark/filters/?backend=${backend}`);
		await expect(page.locator('#status')).toContainText('Draw calls');
		await page.locator('#pause').click();
		for (const effect of ['blur', 'glow', 'dissolve', 'bloom']) {
			await page.locator('#effect').selectOption(effect);
			await page.locator('#amount').fill('60');
			await expect(page.locator('#value')).toHaveText('60');
			await page.locator('#quality').selectOption('2');
		}
		await page.locator('#measure').click();
		await expect(page.locator('#results tr')).toHaveCount(5, { timeout: 90000 });
		await expect(page.locator('#download')).toBeEnabled();
		const downloadEvent = page.waitForEvent('download');
		await page.locator('#download').click();
		const download = await downloadEvent;
		expect(download.suggestedFilename()).toBe(`kurot-filters-${backend}.json`);
		await page.screenshot({ path: `/tmp/kurot-filter-lab-${backend}.png`, fullPage: true });
		expect(errors).toEqual([]);
	});
}
