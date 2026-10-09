import * as kurot from '../../src/index.js';

interface PixelComparison {
	mismatches: number;
	inkCenter: number;
	inkPixels: number;
}

declare global {
	interface Window {
		textAlignment: {
			field: kurot.TextField;
			player: kurot.Player;
			root: kurot.Sprite;
			kurot: typeof kurot;
			compare(): Promise<PixelComparison>;
		};
	}
}

const canvas = document.querySelector('canvas');
if (!canvas) throw new Error('Missing text alignment canvas.');
const params = new URLSearchParams(location.search);
if (params.get('backend') === 'canvas') canvas.getContext('2d');
const resolution = Number(params.get('resolution') ?? 1);
canvas.width = 320 * resolution;
canvas.height = 180 * resolution;
kurot.Capabilities._init();
const player = new kurot.Player(canvas);
player.updateStageSize(320, 180, canvas.width, canvas.height);
const root = new kurot.Sprite();
player.stage.addChild(root);
const field = new kurot.TextField();
field.fontFamily = 'kurot-primary, Arial, sans-serif';
field.size = 18;
field.x = field.y = 30;
field.width = 240;
field.height = 48;
field.multiline = false;
field.textAlign = 'center';
field.verticalAlign = 'middle';
field.strokeColor = 0xffffff;
root.addChild(field);

async function compare(): Promise<PixelComparison> {
	await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
	player.render(false, 0);
	const capture = document.createElement('canvas');
	capture.width = canvas!.width;
	capture.height = canvas!.height;
	const actualContext = capture.getContext('2d')!;
	actualContext.drawImage(canvas!, 0, 0);
	const actual = actualContext.getImageData(0, 0, capture.width, capture.height).data;
	const reference = document.createElement('canvas');
	reference.width = capture.width;
	reference.height = capture.height;
	const context = reference.getContext('2d')!;
	context.scale(resolution, resolution);
	context.translate(field.x, field.y);
	context.textBaseline = 'alphabetic';
	context.textAlign = 'left';
	context.fillStyle = '#ffffff';
	context.strokeStyle = '#ffffff';
	context.lineJoin = 'round';
	const lines = field.getLinesArr();
	const nominalHeight = lines.reduce((height, line) => height + line.height, 0)
		+ (lines.length - 1) * field.lineSpacing;
	let lineTop = Math.max(0, (field.height - nominalHeight) / 2);
	for (const line of lines) {
		const metrics = line.elements.map(element => {
			const style = element.style;
			context.font = kurot.getFontString(style?.size ?? field.size,
				style?.fontFamily ?? field.fontFamily, style?.bold ?? field.bold, style?.italic ?? field.italic);
			return { ink: context.measureText(element.text), frame: context.measureText('') };
		});
		const visible = metrics.map(metric => metric.ink).filter(metric => metric.actualBoundingBoxAscent + metric.actualBoundingBoxDescent > 0);
		const ascent = Math.max(...visible.map(metric => metric.actualBoundingBoxAscent));
		const descent = Math.max(...visible.map(metric => metric.actualBoundingBoxDescent));
		const visual = !field.multiline && field.type === kurot.TextFieldType.DYNAMIC && visible.length > 0;
		const fontAscent = Math.max(0, ...metrics.map(metric => metric.frame.fontBoundingBoxAscent));
		const fontDescent = Math.max(0, ...metrics.map(metric => metric.frame.fontBoundingBoxDescent));
		const baseline = visual ? field.height / 2 + (ascent - descent) / 2
			: lineTop + (line.height + fontAscent - fontDescent) / 2;
		let x = (field.width - line.width) / 2;
		for (const element of line.elements) {
			const style = element.style;
			context.font = kurot.getFontString(style?.size ?? field.size,
				style?.fontFamily ?? field.fontFamily, style?.bold ?? field.bold, style?.italic ?? field.italic);
			const stroke = style?.stroke ?? field.stroke;
			if (stroke > 0) {
				context.lineWidth = stroke * 2;
				context.strokeText(element.text, x, baseline);
			}
			context.fillText(element.text, x, baseline);
			x += element.width;
		}
		lineTop += line.height + field.lineSpacing;
	}
	const expected = context.getImageData(0, 0, reference.width, reference.height).data;
	let mismatches = 0;
	let minY = capture.height;
	let maxY = -1;
	let inkPixels = 0;
	for (let i = 0; i < actual.length; i += 4) {
		if (Math.abs(actual[i + 3] - expected[i + 3]) > 8) mismatches++;
		if (actual[i + 3] > 16) {
			const y = Math.floor(i / 4 / capture.width);
			minY = Math.min(minY, y);
			maxY = Math.max(maxY, y);
			inkPixels++;
		}
	}
	return { mismatches, inkCenter: (minY + maxY + 1) / 2 / resolution - field.y, inkPixels };
}

window.textAlignment = { field, player, root, kurot, compare };
