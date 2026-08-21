import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['test/**/*.test.ts', 'examples/benchmark/tests/**/*.test.ts'],
		environment: 'happy-dom',
	},
});
