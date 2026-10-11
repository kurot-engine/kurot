import { Capabilities, Player, Sprite, TextField } from '@kurot/core';
import { Group, Label, Scroller } from '../../dist/index.js';

interface OutlineCase {
	text: string;
	stroke: number;
	horizontal: string;
	vertical: string;
	mode: 'automatic' | 'height' | 'fixed' | 'maximum' | 'fit' | 'tail';
	italic?: boolean;
}

declare global {
	interface Window {
		labelOutlines: {
			run(options: OutlineCase): {
				different: number;
				painted: number;
				size: number;
				rows: number;
				scroll: number;
			};
			typewriter(): { baselines: number[]; origins: number[] };
			webgl: boolean;
		};
	}
}

const canvas = document.querySelector('canvas');
if (!canvas) throw new Error('Missing outline fixture canvas.');
const options = new URLSearchParams(location.search);
const density = Number(options.get('density') ?? 1);
canvas.width = 640 * density;
canvas.height = 360 * density;
if (options.get('backend') === 'canvas') canvas.getContext('2d');
Capabilities._init();
const player = new Player(canvas);
player.updateStageSize(640, 360, 640 * density, 360 * density);
const root = new Sprite();
player.stage.addChild(root);

function capture(): Uint8ClampedArray {
	player.render(false, 0);
	const snapshot = document.createElement('canvas');
	snapshot.width = canvas.width;
	snapshot.height = canvas.height;
	const context = snapshot.getContext('2d');
	if (!context) throw new Error('Missing outline snapshot context.');
	context.drawImage(canvas, 0, 0);
	return context.getImageData(0, 0, canvas.width, canvas.height).data;
}

function createLabel(text: string): Label {
	const label = new Label(text);
	label.fontFamily = 'OutlineFixture, sans-serif';
	label.bold = true;
	label.size = 26;
	label.strokeColor = 0xff3399;
	label.textColor = 0xffffff;
	label.wordWrap = true;
	return label;
}

window.labelOutlines = {
	webgl: player.isWebGL,
	run(options: OutlineCase) {
		root.removeChildren();
		const label = createLabel(options.text);
		label.stroke = options.stroke;
		label.textAlign = options.horizontal;
		label.verticalAlign = options.vertical;
		label.italic = options.italic ?? false;
		if (options.mode === 'fixed') {
			label.width = 480;
			label.height = 160;
		} else if (options.mode === 'maximum') {
			label.maxWidth = 300;
		} else if (options.mode === 'height') {
			label.height = 100;
		} else if (options.mode === 'fit') {
			label.width = 250;
			label.height = 82;
			label.textFit = 'shrink';
		} else if (options.mode === 'tail') {
			label.width = 480;
		}
		const viewport = new Group();
		viewport.addChild(label);
		label.validateNow();
		const scroller = new Scroller();
		scroller.x = scroller.y = 40;
		scroller.width = label.width;
		scroller.height = options.mode === 'tail' ? 88 : label.height;
		scroller.viewport = viewport;
		root.addChild(scroller);
		scroller.validateNow();
		viewport.validateNow();
		const scroll = Math.max(0, viewport.contentHeight - scroller.height);
		viewport.scrollV = scroll;
		viewport.validateNow();
		const clipped = capture();
		viewport.scrollEnabled = false;
		viewport.y = -scroll;
		const reference = capture();
		let different = 0;
		let painted = 0;
		// Earlier rows above a scrolled viewport are deliberately clipped. Compare
		// the visible region and all space beyond its other three boundaries.
		const startY = (options.mode === 'tail' ? 50 : 0) * density;
		for (let y = startY; y < canvas.height; y++) {
			for (let x = 0; x < canvas.width; x++) {
				const offset = (y * canvas.width + x) * 4;
				if (reference[offset + 3] > 0) painted++;
				if (
					clipped[offset] !== reference[offset] ||
					clipped[offset + 1] !== reference[offset + 1] ||
					clipped[offset + 2] !== reference[offset + 2] ||
					clipped[offset + 3] !== reference[offset + 3]
				) {
					different++;
				}
			}
		}
		const field = label.getChildAt(0);
		if (!(field instanceof TextField)) throw new Error('Missing Label text field.');
		if (label.textFitOverflow) throw new Error('Outline fixture must fit above the minimum size.');
		return { different, painted, size: label.renderedSize, rows: field.numLines, scroll };
	},
	typewriter() {
		root.removeChildren();
		const label = createLabel('Hey '.repeat(30));
		label.width = 240;
		label.stroke = 2;
		label.verticalAlign = 'top';
		root.addChild(label);
		label.validateNow();
		const baselines: number[] = [];
		const origins: number[] = [];
		for (let sentence = 0; sentence < 3; sentence++) {
			label.text = '';
			label.validateNow();
			capture();
			for (const text of ['H', 'He', 'Hey', 'Hey there', 'Hey there! Welcome back again.']) {
				label.text = text;
				label.validateNow();
				capture();
				const field = label.getChildAt(0);
				if (!(field instanceof TextField)) throw new Error('Missing typewriter text field.');
				const line = field.getLinesArr()[0];
				origins.push(field.y);
				baselines.push(field.y + line.inkAscent);
			}
		}
		return { baselines, origins };
	},
};
