import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('../..', import.meta.url));
const durationMinutes = Number(process.env.SOAK_DURATION_MINUTES ?? 0);
const timeout = durationMinutes > 0 ? (durationMinutes + 5) * 60_000 : 120_000;

export default defineConfig({
	testDir: './tests',
	testMatch: 'resource-soak.spec.ts',
	workers: 1,
	retries: 0,
	reporter: [['list']],
	timeout,
	use: { headless: true, viewport: { width: 900, height: 720 } },
	webServer: {
		command: './node_modules/.bin/vite --config vite.config.ts --host 127.0.0.1 --port 4173',
		cwd: packageRoot,
		url: 'http://127.0.0.1:4173/benchmark/soak/',
		reuseExistingServer: !process.env.CI,
		timeout: 120000,
	},
});
