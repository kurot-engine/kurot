import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
	resolve: {
		alias: {
			'@kurot/core': fileURLToPath(new URL('../core/src/index.ts', import.meta.url)),
		},
	},
	test: {
		include: ['test/**/*.test.ts'],
		environment: 'happy-dom',
	},
});
