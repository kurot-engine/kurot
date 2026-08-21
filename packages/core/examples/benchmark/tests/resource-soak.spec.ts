import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

interface SoakSnapshot {
	cycles: number;
	heapUsedBytes?: number;
	framebufferPoolSize: number;
	framebufferPoolBytes: number;
	drawCalls: number;
}

interface SoakState {
	status: string;
	error?: string;
	runCycles(count: number): Promise<SoakSnapshot>;
	restoreContext(): Promise<void>;
	snapshot(): SoakSnapshot;
}

test('resource lifetimes reach a bounded steady state and survive context restoration', async ({ page }) => {
	await page.goto('http://127.0.0.1:4173/benchmark/soak/');
	await page.waitForFunction(() => !!(window as Window & { __KUROT_RESOURCE_SOAK__?: SoakState }).__KUROT_RESOURCE_SOAK__);
	const cdp = await page.context().newCDPSession(page);
	const durationMinutes = readDurationMinutes();
	const deadline = durationMinutes > 0 ? Date.now() + durationMinutes * 60_000 : undefined;
	const samples: SoakSnapshot[] = [];

	do {
		await page.evaluate(() =>
			(window as Window & { __KUROT_RESOURCE_SOAK__: SoakState }).__KUROT_RESOURCE_SOAK__.runCycles(20),
		);
		await cdp.send('HeapProfiler.collectGarbage');
		samples.push(await page.evaluate(() =>
			(window as Window & { __KUROT_RESOURCE_SOAK__: SoakState }).__KUROT_RESOURCE_SOAK__.snapshot(),
		));
	} while (deadline ? Date.now() < deadline : samples.length < 10);

	await page.evaluate(() =>
		(window as Window & { __KUROT_RESOURCE_SOAK__: SoakState }).__KUROT_RESOURCE_SOAK__.restoreContext(),
	);
	const restored = await page.evaluate(() =>
		(window as Window & { __KUROT_RESOURCE_SOAK__: SoakState }).__KUROT_RESOURCE_SOAK__.snapshot(),
	);
	samples.push(restored);

	const report = analyze(samples, durationMinutes);
	const outputRoot = resolve(process.cwd(), 'examples/benchmark/results/soak');
	await mkdir(outputRoot, { recursive: true });
	await writeFile(resolve(outputRoot, 'resource-soak.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');

	const maxPoolSize = Math.max(...samples.map(item => item.framebufferPoolSize));
	const maxPoolBytes = Math.max(...samples.map(item => item.framebufferPoolBytes));
	expect(maxPoolSize).toBeGreaterThan(0);
	expect(maxPoolSize).toBeLessThanOrEqual(16);
	expect(maxPoolBytes).toBeLessThanOrEqual(64 * 1024 * 1024);
	expect(report.heapPlateau, report.heapReason).toBe(true);
});

function analyze(samples: SoakSnapshot[], durationMinutes: number): {
	durationMinutes: number;
	samples: SoakSnapshot[];
	heapPlateau: boolean;
	heapReason: string;
} {
	const heap = samples.map(item => item.heapUsedBytes).filter((value): value is number => value !== undefined);
	if (heap.length < 4) {
		return { durationMinutes, samples, heapPlateau: true, heapReason: 'Precise JS heap metrics are unavailable.' };
	}
	const tail = heap.slice(Math.floor(heap.length / 2));
	const spread = Math.max(...tail) - Math.min(...tail);
	const allowance = Math.max(8 * 1024 * 1024, tail[0] * 0.2);
	const heapPlateau = spread <= allowance;
	return {
		durationMinutes,
		samples,
		heapPlateau,
		heapReason: heapPlateau
			? `Tail heap spread ${spread} bytes is within allowance ${allowance} bytes.`
			: `Tail heap spread ${spread} bytes exceeds allowance ${allowance} bytes.`,
	};
}

function readDurationMinutes(): number {
	const value = Number(process.env.SOAK_DURATION_MINUTES ?? 0);
	return Number.isFinite(value) && value > 0 ? value : 0;
}
