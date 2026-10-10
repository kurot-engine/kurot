import * as kurot from '../../src/index.js';

interface PixelComparison {
	mismatches: number;
	inkCenter: number;
	inkTop: number;
	inkBottom: number;
	inkPixels: number;
}

declare global {
	interface Window {
		textAlignment: {
			field: kurot.TextField;
			player: kurot.Player;
			root: kurot.Sprite;
			kurot: typeof kurot;
			compare(clip?: boolean): Promise<PixelComparison>;
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
field.strokeColor = 0xffffff;
root.addChild(field);

async function compare(clip = false): Promise<PixelComparison> {
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
	const measured = lines.map(line => {
		const metrics = line.elements.map(element => {
			const style = element.style;
			context.font = kurot.getFontString(style?.size ?? field.size,
				style?.fontFamily ?? field.fontFamily, style?.bold ?? field.bold, style?.italic ?? field.italic);
			return { ink: context.measureText(element.text), frame: context.measureText('') };
		});
		const visible = metrics.map(metric => metric.ink).filter(metric => metric.actualBoundingBoxAscent + metric.actualBoundingBoxDescent > 0);
		context.font = kurot.getFontString(field.size, field.fontFamily, field.bold, field.italic);
		const emptyFrame = context.measureText('');
		const fontAscent = Math.max(0, ...metrics.map(metric => metric.frame.fontBoundingBoxAscent));
		const fontDescent = Math.max(0, ...metrics.map(metric => metric.frame.fontBoundingBoxDescent));
		const baseline = (line.height + (metrics.length ? fontAscent : emptyFrame.fontBoundingBoxAscent)
			- (metrics.length ? fontDescent : emptyFrame.fontBoundingBoxDescent)) / 2;
		return { line, baseline,
			top: visible.length ? baseline - Math.max(...visible.map(metric => metric.actualBoundingBoxAscent)) : 0,
			bottom: visible.length ? baseline + Math.max(...visible.map(metric => metric.actualBoundingBoxDescent)) : line.height };
	});
	let cursor = 0;
	const edges = measured.flatMap(row => {
		const edge = [cursor + row.top, cursor + row.bottom];
		cursor += row.line.height + field.lineSpacing;
		return edge;
	});
	const input = field.type === kurot.TextFieldType.INPUT;
	const top = input ? 0 : Math.min(...edges);
	const bottom = input ? nominalHeight : Math.max(...edges);
	const factor = field.verticalAlign === 'middle' ? 0.5 : field.verticalAlign === 'bottom' ? 1 : 0;
	const freeHeight = field.height - (bottom - top);
	let lineTop = (input ? Math.max(0, freeHeight) : freeHeight) * factor - top;
	if (input || clip) {
		context.beginPath();
		context.rect(0, 0, field.width, field.height);
		context.clip();
	}
	const editing = input && field.isTyping;
	const selectionStart = Math.min(field.selectionBeginIndex, field.selectionEndIndex);
	const selectionEnd = Math.max(field.selectionBeginIndex, field.selectionEndIndex);
	let characterIndex = 0;
	let caret: { x: number; y: number; height: number } | undefined;
	for (const { line, baseline: rowBaseline } of measured) {
		const baseline = lineTop + rowBaseline;
		let x = field.textAlign === 'center' ? (field.width - line.width) / 2
			: field.textAlign === 'right' ? field.width - line.width : 0;
		for (const element of line.elements) {
			const style = element.style;
			context.font = kurot.getFontString(style?.size ?? field.size,
				style?.fontFamily ?? field.fontFamily, style?.bold ?? field.bold, style?.italic ?? field.italic);
			const end = characterIndex + element.text.length;
			if (editing && selectionStart < end && selectionEnd > characterIndex) {
				const start = Math.max(0, selectionStart - characterIndex);
				const stop = Math.min(element.text.length, selectionEnd - characterIndex);
				context.fillStyle = 'rgba(51, 144, 255, 0.55)';
				context.fillRect(x + context.measureText(element.text.slice(0, start)).width, lineTop,
					context.measureText(element.text.slice(start, stop)).width, line.height);
			}
			if (editing && !caret && field.caretIndex >= characterIndex && field.caretIndex <= end) {
				caret = { x: x + context.measureText(element.text.slice(0, field.caretIndex - characterIndex)).width,
					y: lineTop, height: line.height };
			}
			context.fillStyle = '#ffffff';
			const stroke = style?.stroke ?? field.stroke;
			if (stroke > 0) {
				context.lineWidth = stroke * 2;
				context.strokeText(element.text, x, baseline);
			}
			context.fillText(element.text, x, baseline);
			if (editing && field.$compositionStart < end && field.$compositionEnd > characterIndex
				&& field.$compositionStart >= 0) {
				const start = Math.max(0, field.$compositionStart - characterIndex);
				const stop = Math.min(element.text.length, field.$compositionEnd - characterIndex);
				const ink = context.measureText(element.text);
				context.fillRect(x + context.measureText(element.text.slice(0, start)).width,
					Math.min(lineTop + line.height - 1, baseline + Math.max(1, ink.actualBoundingBoxDescent)),
					context.measureText(element.text.slice(start, stop)).width, 1);
			}
			x += element.width;
			characterIndex = end;
		}
		characterIndex += line.charNum - line.elements.reduce((length, element) => length + element.text.length, 0);
		lineTop += line.height + field.lineSpacing;
	}
	if (editing && caret && field.$caretVisible && selectionStart === selectionEnd) {
		context.fillRect(caret.x, caret.y, 1, caret.height);
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
	return { mismatches, inkCenter: (minY + maxY + 1) / 2 / resolution - field.y,
		inkTop: minY / resolution - field.y, inkBottom: (maxY + 1) / resolution - field.y, inkPixels };
}

window.textAlignment = { field, player, root, kurot, compare };
