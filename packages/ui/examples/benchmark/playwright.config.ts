import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
	testDir: './tests',
	testMatch: 'benchmark.spec.ts',
	fullyParallel: false,
	workers: 1,
	retries: 0,
	reporter: [['list']],
	timeout: 10 * 60 * 1000,
	use: {
		headless: process.env.UI_BENCHMARK_RUN_MODE !== 'headed',
		viewport: { width: 1180, height: 760 },
		baseURL: 'http://127.0.0.1:4175',
	},
	webServer: {
		command: './node_modules/.bin/vite --config vite.config.ts --host 127.0.0.1 --port 4175',
		cwd: packageRoot,
		url: 'http://127.0.0.1:4175/benchmark/',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
