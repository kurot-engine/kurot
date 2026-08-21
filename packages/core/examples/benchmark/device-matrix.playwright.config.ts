import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
	testDir: './tests',
	testMatch: 'device-matrix.spec.ts',
	workers: 1,
	retries: 0,
	reporter: [['list']],
	timeout: 120000,
	use: { headless: true, viewport: { width: 1160, height: 760 } },
	webServer: {
		command: './node_modules/.bin/vite --config vite.config.ts --host 127.0.0.1 --port 4173',
		cwd: packageRoot,
		url: 'http://127.0.0.1:4173/benchmark/device-matrix/',
		reuseExistingServer: !process.env.CI,
		timeout: 120000,
	},
});
