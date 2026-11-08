import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Integration tests start real compilers and wait up to 10s per watcher event.
		maxWorkers: 2,
		testTimeout: 30_000,
	},
});
