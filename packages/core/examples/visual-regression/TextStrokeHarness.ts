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
const height = Number(params.get('height') ?? 180);
canvas.width = 320 * resolution;
canvas.height = height * resolution;
kurot.Capabilities._init();
const player = new kurot.Player(canvas);
player.updateStageSize(320, height, 320 * resolution, height * resolution);
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
	// WebKit's CPU and accelerated Canvas paths use different text antialiasing.
	// Match the raster surface kind while keeping placement independently derived.
	const rasterized = player.isWebGL || !!field.$displayList || !!root.$displayList
		|| !!root.filters?.length || !!field.mask;
	const context = reference.getContext('2d', { willReadFrequently: rasterized })!;
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
	context.font = kurot.getFontString(field.size, field.fontFamily, field.bold, field.italic);
	const font = context.measureText('');
	const rowHeight = field.type === kurot.TextFieldType.INPUT ? field.size
		: Math.max(field.size, font.fontBoundingBoxAscent + font.fontBoundingBoxDescent);
	const baseline = (rowHeight + font.fontBoundingBoxAscent - font.fontBoundingBoxDescent) / 2;
	const y = baseline + (field.verticalAlign === kurot.VerticalAlign.BOTTOM ? field.height - rowHeight
		: field.verticalAlign === kurot.VerticalAlign.MIDDLE ? (field.height - rowHeight) / 2 : 0);
	for (const element of line.elements) {
		const stroke = element.style?.stroke ?? field.stroke;
		context.font = kurot.getFontString(element.style?.size ?? field.size, element.style?.fontFamily ?? field.fontFamily,
			element.style?.bold ?? field.bold, element.style?.italic ?? field.italic);
		context.strokeStyle = '#' + (element.style?.strokeColor ?? field.strokeColor).toString(16).padStart(6, '0');
		context.lineWidth = stroke * 2;
		if (stroke > 0) {
			context.strokeText(element.text, x, y);
		}
		context.fillStyle = '#' + (element.style?.textColor ?? field.textColor).toString(16).padStart(6, '0');
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
