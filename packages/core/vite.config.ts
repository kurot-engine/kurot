import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
	root: resolve(__dirname, 'examples'),
	server: {
		fs: {
			allow: [resolve(__dirname)],
		},
	},
	build: {
		outDir: resolve(__dirname, 'benchmark-dist'),
		emptyOutDir: true,
		rollupOptions: {
			input: {
				index: resolve(__dirname, 'examples/index.html'),
				benchmark: resolve(__dirname, 'examples/benchmark.html'),
				'visual-test': resolve(__dirname, 'examples/visual-test.html'),
				'text-test': resolve(__dirname, 'examples/text-test.html'),
				'bitmap-test': resolve(__dirname, 'examples/bitmap-test.html'),
				'mesh-test': resolve(__dirname, 'examples/mesh-test.html'),
				'sound-test': resolve(__dirname, 'examples/sound-test.html'),
				'video-test': resolve(__dirname, 'examples/video-test.html'),
				'net-test': resolve(__dirname, 'examples/net-test.html'),
				'egret-benchmark': resolve(__dirname, 'examples/egret-benchmark.html'),
			},
		},
	},
	resolve: {
		alias: {
			'../src': resolve(__dirname, 'src'),
		},
	},
});
