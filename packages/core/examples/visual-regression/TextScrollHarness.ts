import { Capabilities, Player, Sprite, TextField } from '../../src/index.js';

interface ScrollReport {
	backend: string;
	cases: number;
	failures: string[];
}

declare global {
	interface Window {
		runTextScrollChecks(): ScrollReport;
	}
}

window.runTextScrollChecks = (): ScrollReport => {
	const canvas = document.querySelector('canvas');
	if (!canvas) {
		throw new Error('Missing text-scroll canvas.');
	}
	const params = new URLSearchParams(location.search);
	const resolution = Number(params.get('resolution') ?? 1);
	if (params.get('backend') === 'canvas') {
		canvas.getContext('2d');
	}
	Capabilities._init();
	const player = new Player(canvas);
	player.updateStageSize(260, 180, 260 * resolution, 180 * resolution);
	const root = new Sprite();
	player.stage.addChild(root);
	const gl = player.isWebGL ? canvas.getContext('webgl2') ?? canvas.getContext('webgl') : undefined;
	const report: ScrollReport = {
		backend: gl ? gl instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl1' : 'canvas',
		cases: 0, failures: [],
	};
	const capture = document.createElement('canvas');
	capture.width = canvas.width;
	capture.height = canvas.height;
	const context = capture.getContext('2d', { willReadFrequently: true });
	if (!context) {
		throw new Error('Missing text-scroll capture context.');
	}
	const paint = (): Uint8ClampedArray => {
		player.render(false, 0);
		context.clearRect(0, 0, capture.width, capture.height);
		context.drawImage(canvas, 0, 0);
		return context.getImageData(0, 0, capture.width, capture.height).data;
	};
	const check = (ok: boolean, message: string): void => {
		if (!ok) {
			report.failures.push(message);
		}
	};
	try {
		for (const [size, tailSize, spacing, height] of [[32, 16, 0, 0], [32, 16, 8, 0], [100, 20, 0, 90]]) {
			const field = new TextField();
			field.fontFamily = 'Arial';
			field.size = size;
			field.width = 220;
			field.x = field.y = 20;
			field.verticalAlign = 'top';
			field.lineSpacing = spacing;
			field.textFlow = [
				{ text: 'A\n', style: { textColor: 0xff0000 } },
				{ text: 'body', style: { size: tailSize, textColor: 0x00ff00 } },
			];
			const lines = field.getLinesArr();
			field.height = height || Math.ceil(lines[0].height + spacing + lines[1].height / 4);
			if (!height) {
				check(lines[0].height < field.height, 'the normal title fits completely before scrolling');
			}
			root.addChild(field);
			field.scrollV = 99;
			check(field.maxScrollV === 2 && field.scrollV === 2, `${size}/${tailSize}/${spacing}: terminal row reachable`);
			check(field.getScrollYOffset() === lines[0].height + spacing, 'scroll offset includes the preceding complete row and gap');
			const actual = paint();
			const reference = new TextField();
			reference.fontFamily = field.fontFamily;
			reference.size = tailSize;
			reference.width = field.width;
			reference.height = field.height;
			reference.x = field.x;
			reference.y = field.y;
			reference.verticalAlign = 'top';
			reference.textColor = 0x00ff00;
			reference.text = 'body';
			root.removeChild(field);
			root.addChild(reference);
			const expected = paint();
			let differences = 0;
			let painted = 0;
			for (let index = 0; index < actual.length; index++) {
				if (Math.abs(actual[index] - expected[index]) > 1) {
					differences++;
				}
				if (index % 4 === 3 && actual[index] > 10) {
					painted++;
				}
			}
			check(differences === 0 && painted > 30,
				`${size}/${tailSize}/${spacing}: scrolled body matches standalone body pixels (${differences} differences, ${painted} ink)`);
			root.removeChild(reference);
			report.cases++;
		}
		return report;
	} finally {
		player.stage.removeChildren();
		player.destroy();
	}
};
