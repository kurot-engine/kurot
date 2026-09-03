import { expect, test } from '@playwright/test';

type GoldenBackend = 'canvas2d' | 'webgl1' | 'webgl2';

interface VisualGoldenState {
	status: 'initializing' | 'ready' | 'error';
	error?: string;
	supportsContextRestore: boolean;
	restoreContext(): Promise<void>;
}

const backends: GoldenBackend[] = ['canvas2d', 'webgl1', 'webgl2'];

for (const backend of backends) {
	test(`${backend} matches the deterministic golden scene`, async ({ page }) => {
		await openGolden(page, backend);
		await expect(page.locator('#golden')).toHaveScreenshot(`${backend}.png`, {
			animations: 'disabled',
			maxDiffPixelRatio: 0.001,
			threshold: 0.2,
		});
	});

	if (backend !== 'canvas2d') {
		test(`${backend} reproduces the scene after context restoration`, async ({ page }) => {
			await openGolden(page, backend);
			const supported = await page.evaluate(() =>
				(window as Window & { __KUROT_VISUAL_GOLDEN__: VisualGoldenState }).__KUROT_VISUAL_GOLDEN__.supportsContextRestore,
			);
			test.skip(!supported, 'WEBGL_lose_context is unavailable.');
			await page.evaluate(() =>
				(window as Window & { __KUROT_VISUAL_GOLDEN__: VisualGoldenState }).__KUROT_VISUAL_GOLDEN__.restoreContext(),
			);
			await expect(page.locator('#golden')).toHaveScreenshot(`${backend}.png`, {
				animations: 'disabled',
				maxDiffPixelRatio: 0.001,
				threshold: 0.2,
			});
		});
	}
}

test('webgl2 renders with a high-density backing store', async ({ browser }) => {
	const context = await browser.newContext({
		viewport: { width: 640, height: 480 },
		deviceScaleFactor: 2,
	});
	const page = await context.newPage();

	try {
		await openGolden(page, 'webgl2');
		const size = await page.locator('#golden').evaluate(canvas => ({
			width: (canvas as HTMLCanvasElement).width,
			height: (canvas as HTMLCanvasElement).height,
			clientWidth: (canvas as HTMLCanvasElement).clientWidth,
			clientHeight: (canvas as HTMLCanvasElement).clientHeight,
		}));

		expect(size).toEqual({
			width: 1280,
			height: 960,
			clientWidth: 640,
			clientHeight: 480,
		});
	} finally {
		await context.close();
	}
});

async function openGolden(page: import('@playwright/test').Page, backend: GoldenBackend): Promise<void> {
	await page.goto(`http://127.0.0.1:4174/visual-regression/?backend=${backend}`);
	await page.waitForFunction(() => {
		const state = (window as Window & { __KUROT_VISUAL_GOLDEN__?: VisualGoldenState }).__KUROT_VISUAL_GOLDEN__;
		return state?.status === 'ready' || state?.status === 'error';
	});
	const error = await page.evaluate(() =>
		(window as Window & { __KUROT_VISUAL_GOLDEN__: VisualGoldenState }).__KUROT_VISUAL_GOLDEN__.error,
	);
	expect(error).toBeUndefined();
}
