import { Capabilities, Player, Rectangle, Sprite, TextField } from '@kurot/core';
import type { DisplayObject, ITextElement } from '@kurot/core';
import { Label, RichLabel } from '../../dist/index.js';
import { textLanguages } from '../../../core/test/fixtures/text/languages.js';

const canvas = document.querySelector('canvas');
if (!canvas) {
	throw new Error('Missing text-components canvas.');
}
const params = new URLSearchParams(location.search);
const density = Number(params.get('density') ?? 1);
canvas.width = 360 * density;
canvas.height = 220 * density;
if (params.get('backend') === 'canvas') {
	canvas.getContext('2d');
}
Capabilities._init();
const player = new Player(canvas);
player.updateStageSize(360, 220, canvas.width, canvas.height);
const root = new Sprite();
player.stage.addChild(root);
const snapshot = document.createElement('canvas');
snapshot.width = canvas.width;
snapshot.height = canvas.height;
const context = snapshot.getContext('2d', { willReadFrequently: true });
if (!context) {
	throw new Error('Missing text-components capture context.');
}

function check(condition: boolean, message: string): void {
	if (!condition) {
		throw new Error(message);
	}
}

function fieldOf(label: Label | RichLabel): TextField {
	const field = label.getChildAt(0);
	if (!(field instanceof TextField)) {
		throw new Error('Missing native text field.');
	}
	return field;
}

function mount(node: DisplayObject): void {
	root.removeChildren();
	root.addChild(node);
	if (node instanceof Label || node instanceof RichLabel) {
		node.validateNow();
	}
}

function paint(): Uint8ClampedArray {
	player.render(false, 0);
	context!.clearRect(0, 0, snapshot.width, snapshot.height);
	context!.drawImage(canvas!, 0, 0);
	return context!.getImageData(0, 0, snapshot.width, snapshot.height).data;
}

function samePixels(actual: Uint8ClampedArray, expected: Uint8ClampedArray, name: string): void {
	let mismatches = 0;
	let painted = 0;
	for (let index = 0; index < actual.length; index++) {
		if (actual[index] !== expected[index]) {
			mismatches++;
		}
		if (index % 4 === 3 && actual[index] > 0) {
			painted++;
		}
	}
	check(painted > 20, `${name}: no visible text`);
	check(mismatches === 0, `${name}: ${mismatches} channel differences`);
}

function configure(field: Label | RichLabel | TextField, family: string): void {
	field.fontFamily = family;
	field.size = 24;
	field.x = field.y = 24;
	field.wordWrap = true;
	field.lineSpacing = 3;
	field.textAlign = 'center';
	field.textColor = 0xffffff;
	field.strokeColor = 0xff3399;
}

function run(code: string, family: string, reserve = false): { comparisons: number; prefixes: number } {
	const language = textLanguages.find(item => item.code === code);
	if (!language) {
		throw new Error(`Unknown text fixture ${code}.`);
	}
	let comparisons = 0;
	// Label reserves its documented outline inset; compare identical content
	// regions so the component-specific outer boxes cannot hide a baseline error.
	for (const alignment of ['top', 'middle', 'bottom'] as const) {
		for (const stroke of [0, 2]) {
			const label = new Label(language.text);
			configure(label, family);
			label.stroke = stroke;
			label.verticalAlign = alignment;
			label.width = 300;
			label.height = 112;
			mount(label);
			const plain = paint();
			const insetX = stroke ? 6 : 0;
			const insetY = stroke ? 4 : 0;
			const rich = new RichLabel([{ text: language.text }]);
			rich.outlineLayout = reserve ? 'reserve-space' : 'render-only';
			configure(rich, family);
			rich.stroke = stroke;
			rich.verticalAlign = alignment;
			rich.x += reserve ? 0 : insetX;
			rich.y += reserve ? 0 : insetY;
			rich.width = 300 - (reserve ? 0 : insetX * 2);
			rich.height = 112 - (reserve ? 0 : insetY * 2);
			mount(rich);
			if (reserve) {
				check(rich.height === label.height && rich.width === label.width, `${code}: equal outer boxes`);
			}
			samePixels(paint(), plain, `${code}/${alignment}/${stroke} Label vs RichLabel`);
			comparisons++;
		}
	}
	const flow: ITextElement[] = [
		{ text: language.variants[0], style: { size: 28, bold: true, textColor: 0xff3333, stroke: 2 } },
		{ text: ` ${language.variants[1]}`, style: { size: 18, italic: true, textColor: 0x33ff33, stroke: 0 } },
		{ text: ' A\n', style: { size: 16, fontFamily: 'Fixture-noto-sans', textColor: 0x3399ff } },
		{ text: `${language.text} ${language.text}` },
	];
	const original = JSON.stringify(flow);
	for (const alignment of ['top', 'middle', 'bottom'] as const) {
		for (const automatic of [true, false]) {
			const rich = new RichLabel(flow);
			rich.outlineLayout = reserve ? 'reserve-space' : 'render-only';
			configure(rich, family);
			rich.width = 260;
			rich.height = automatic ? NaN : 140;
			rich.verticalAlign = alignment;
			mount(rich);
			const actual = paint();
			const clip = new Rectangle(0, 0, 220, Math.floor(rich.y + rich.height - 8));
			root.scrollRect = clip;
			const clipped = paint();
			root.scrollRect = undefined;
			const reference = new TextField();
			configure(reference, family);
			const native = fieldOf(rich);
			reference.x = rich.x + native.x;
			reference.y = rich.y + native.y;
			reference.width = native.width;
			reference.height = native.height;
			reference.verticalAlign = alignment;
			reference.textFlow = flow;
			check(Math.abs(rich.textHeight - reference.textHeight) < 0.001, `${code}: mixed-flow height`);
			if (automatic) {
				check(Math.abs(rich.height - reference.textHeight - native.y * 2) < 0.001, `${code}: automatic RichLabel height`);
			}
			mount(reference);
			samePixels(actual, paint(), `${code}/${alignment}/${automatic} rich runs vs native field`);
			root.scrollRect = clip;
			samePixels(clipped, paint(), `${code}/${alignment}/${automatic} clipped rich runs vs native field`);
			root.scrollRect = undefined;
			check(
				JSON.stringify(flow) === original && JSON.stringify(rich.textFlow) === original,
				`${code}: changed source runs`,
			);
			comparisons++;
		}
	}
	const rich = new RichLabel();
	rich.outlineLayout = reserve ? 'reserve-space' : 'render-only';
	rich.stroke = reserve ? 1 : 0;
	configure(rich, family);
	rich.width = 150;
	rich.verticalAlign = 'top';
	mount(rich);
	let firstBaseline: number | undefined;
	let prefixes = 0;
	for (let pass = 0; pass < 2; pass++) {
		rich.textFlow = [];
		rich.validateNow();
		paint();
		check(rich.height === 0, `${code}: clearing must clear automatic height`);
		let prefix = '';
		for (const character of Array.from(language.text)) {
			prefix += character;
			rich.textFlow = [{ text: prefix, style: { bold: true, textColor: 0xff3333 } }];
			rich.validateNow();
			player.render(false, 0);
			const field = fieldOf(rich);
			const baseline = field.y + field.getLinesArr()[0].baseline;
			firstBaseline ??= baseline;
			check(Math.abs(baseline - firstBaseline) < 0.001, `${code}: RichLabel typewriter jumped`);
			prefixes++;
		}
	}
	return { comparisons, prefixes };
}

function outlineGeometry(family: string, reserve = false) {
	return [0, 0.5, 1, 2, 6].map(stroke => {
		return [new Label('Specialty'), new RichLabel([{ text: 'Specialty' }])].map(component => {
			if (component instanceof RichLabel) {
				component.outlineLayout = reserve ? 'reserve-space' : 'render-only';
			}
			component.fontFamily = family;
			component.size = 16;
			component.stroke = stroke;
			component.multiline = false;
			component.verticalAlign = 'top';
			component.x = component.y = 24;
			mount(component);
			const pixels = paint();
			let inkTop = Infinity;
			let inkBottom = -Infinity;
			for (let y = 0; y < snapshot.height; y++) {
				for (let x = 0; x < snapshot.width; x++) {
					if (pixels[(y * snapshot.width + x) * 4 + 3] > 0) {
						inkTop = Math.min(inkTop, y / density);
						inkBottom = Math.max(inkBottom, (y + 1) / density);
					}
				}
			}
			const field = fieldOf(component);
			return {
				stroke, height: component.height, lineHeight: field.textHeight,
				origin: field.y, baseline: field.y + field.getLinesArr()[0].baseline,
				inkTop: inkTop - component.y, inkBottom: inkBottom - component.y,
			};
		});
	});
}

declare global {
	interface Window {
		textComponents: { run: typeof run; outlineGeometry: typeof outlineGeometry; webgl: boolean };
	}
}
window.textComponents = { run, outlineGeometry, webgl: player.isWebGL };
