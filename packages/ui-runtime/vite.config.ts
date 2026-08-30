import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
	root: resolve(import.meta.dirname, 'examples'),
	server: {
		fs: {
			allow: [resolve(import.meta.dirname)],
		},
	},
	build: {
		outDir: resolve(import.meta.dirname, 'examples/preview/dist'),
		emptyOutDir: true,
		rollupOptions: {
			input: resolve(import.meta.dirname, 'examples/preview/index.html'),
		},
	},
	resolve: {
		alias: {
			'@kurot/ui-runtime': resolve(import.meta.dirname, 'src/index.ts'),
		},
	},
});
