import * as kurot from '../../src/index.js';

interface PixelComparison {
	lost: number;
	extra: number;
	inkOutsideLayout: number;
}

declare global {
	interface Window {
		textStroke: {
			kurot: typeof kurot;
			player: kurot.Player;
			root: kurot.Sprite;
			field: kurot.TextField;
			compare(clip?: boolean): PixelComparison;
			paint(): Uint8ClampedArray;
		};
	}
}

const canvas = document.querySelector('canvas');
if (!canvas) throw new Error('Missing stroke test canvas.');
const params = new URLSearchParams(location.search);
if (params.get('backend') === 'canvas') {
	canvas.getContext('2d');
}
const resolution = Number(params.get('resolution') ?? 1);
canvas.width = 320 * resolution;
canvas.height = 180 * resolution;
kurot.Capabilities._init();
const player = new kurot.Player(canvas);
player.updateStageSize(320, 180, 320 * resolution, 180 * resolution);
const root = new kurot.Sprite();
player.stage.addChild(root);
const field = new kurot.TextField();
field.fontFamily = 'Arial';
field.size = 20;
field.text = 'How to play';
field.stroke = 2;
field.strokeColor = 0xff0000;
field.x = field.y = 30;
root.addChild(field);

function paint(): Uint8ClampedArray {
	player.render(false, 0);
	const capture = document.createElement('canvas');
	capture.width = canvas!.width;
	capture.height = canvas!.height;
	const context = capture.getContext('2d')!;
	context.drawImage(canvas!, 0, 0);
	return context.getImageData(0, 0, capture.width, capture.height).data;
}

function compare(clip = false): PixelComparison {
	const actual = paint();
	const reference = document.createElement('canvas');
	reference.width = canvas!.width;
	reference.height = canvas!.height;
	const context = reference.getContext('2d')!;
	context.scale(resolution, resolution);
	context.translate(field.x, field.y);
	if (clip) {
		context.beginPath();
		context.rect(0, 0, field.width, field.height);
		context.clip();
	}
	context.textBaseline = 'alphabetic';
	context.textAlign = 'left';
	context.lineJoin = 'round';
	const line = field.getLinesArr()[0];
	let x = field.textAlign === kurot.HorizontalAlign.CENTER ? (field.width - line.width) / 2
		: field.textAlign === kurot.HorizontalAlign.RIGHT ? field.width - line.width : 0;
	context.font = '20px Arial';
	const font = context.measureText('');
	const baseline = (20 + font.fontBoundingBoxAscent - font.fontBoundingBoxDescent) / 2;
	let y = baseline + (field.verticalAlign === kurot.VerticalAlign.BOTTOM ? field.height - 20
		: field.verticalAlign === kurot.VerticalAlign.MIDDLE ? (field.height - 20) / 2 : 0);
	if (field.type === kurot.TextFieldType.DYNAMIC) {
		const ink = line.elements.map(element => context.measureText(element.text))
			.filter(metrics => metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent > 0);
		if (ink.length > 0) {
			const ascent = Math.max(...ink.map(metrics => metrics.actualBoundingBoxAscent));
			const descent = Math.max(...ink.map(metrics => metrics.actualBoundingBoxDescent));
			y = field.verticalAlign === kurot.VerticalAlign.TOP ? ascent
				: field.verticalAlign === kurot.VerticalAlign.BOTTOM ? field.height - descent
					: field.height / 2 + (ascent - descent) / 2;
		}
	}
	for (const element of line.elements) {
		const stroke = element.style?.stroke ?? field.stroke;
		context.font = '20px Arial';
		context.strokeStyle = '#ff0000';
		context.lineWidth = stroke * 2;
		if (stroke > 0) {
			context.strokeText(element.text, x, y);
		}
		context.fillStyle = '#ffffff';
		context.fillText(element.text, x, y);
		x += element.width;
	}
	const expected = context.getImageData(0, 0, reference.width, reference.height).data;
	let lost = 0;
	let extra = 0;
	let inkOutsideLayout = 0;
	for (let i = 0; i < actual.length; i += 4) {
		if (expected[i + 3] - actual[i + 3] > 8) lost++;
		if (actual[i + 3] - expected[i + 3] > 8) extra++;
		const px = (i / 4 % reference.width) / resolution;
		const py = Math.floor(i / 4 / reference.width) / resolution;
		if (actual[i + 3] > 20 && (px < field.x || py < field.y
			|| px >= field.x + field.width || py >= field.y + field.height)) {
			inkOutsideLayout++;
		}
	}
	return { lost, extra, inkOutsideLayout };
}

window.textStroke = { kurot, player, root, field, paint, compare };
