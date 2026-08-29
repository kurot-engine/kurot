export default {
	target: 'html5',
	entry: 'src/Main.ts',
	output: { dir: 'bin-debug' },
	html: { template: 'template/web/index.html' },
	stage: {
		width: 640,
		height: 1136,
		scaleMode: 'showAll',
		orientation: 'auto',
		frameRate: 60,
	},
	exml: {
		themeFile: 'resource/default.thm.json',
		components: {
			namespace: 'game',
			sourceDir: 'src/components',
			skinDir: 'resource/skins/components',
		},
	},
};
