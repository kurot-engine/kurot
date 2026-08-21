import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
	testDir: './tests',
	testMatch: 'visual.spec.ts',
	fullyParallel: false,
	workers: 1,
	retries: 0,
	reporter: [['list']],
	timeout: 120000,
	expect: {
		toHaveScreenshot: {
			animations: 'disabled',
		},
	},
	snapshotPathTemplate: '{testDir}/snapshots/{arg}{ext}',
	use: {
		headless: true,
		viewport: { width: 640, height: 480 },
	},
	webServer: {
		command: './node_modules/.bin/vite --config vite.config.ts --host 127.0.0.1 --port 4174',
		cwd: packageRoot,
		url: 'http://127.0.0.1:4174/visual-regression/',
		reuseExistingServer: !process.env.CI,
		timeout: 120000,
	},
});
