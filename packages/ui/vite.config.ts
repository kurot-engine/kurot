import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
	root: resolve(import.meta.dirname, 'examples'),
	server: {
		fs: {
			allow: [resolve(import.meta.dirname), resolve(import.meta.dirname, '../core')],
		},
	},
	build: {
		outDir: resolve(import.meta.dirname, 'examples/benchmark/dist'),
		emptyOutDir: true,
		rollupOptions: {
			input: {
				benchmark: resolve(import.meta.dirname, 'examples/benchmark/index.html'),
			},
		},
	},
	resolve: {
		alias: {
			'@kurot/core': resolve(import.meta.dirname, '../core/src/index.ts'),
			'@kurot/ui': resolve(import.meta.dirname, 'src/index.ts'),
		},
	},
});
