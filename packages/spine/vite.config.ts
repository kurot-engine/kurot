import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
	root: resolve(__dirname, 'example'),
	server: {
		fs: {
			allow: [resolve(__dirname)],
		},
	},
	resolve: {
		alias: {
			'@kurot/spine': resolve(__dirname, 'src/index.ts'),
		},
	},
});
