import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const runMode = process.env.BENCHMARK_RUN_MODE === 'headed' ? 'headed' : 'headless';
const packageRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
	testDir: './tests',
	testMatch: 'comparison.spec.ts',
	fullyParallel: false,
	workers: 1,
	retries: 0,
	reporter: [['list']],
	timeout: 20 * 60 * 1000,
	use: {
		headless: runMode === 'headless',
		viewport: { width: 1160, height: 680 },
	},
	webServer: {
		command: './node_modules/.bin/vite --config vite.config.ts --host 127.0.0.1 --port 4173',
		cwd: packageRoot,
		url: 'http://127.0.0.1:4173/benchmark/',
		reuseExistingServer: !process.env.CI,
		timeout: 120000,
	},
});
