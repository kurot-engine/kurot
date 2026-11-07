import { Capabilities, Player, Sprite, TextField } from '@kurot/core';
import { Label, RichLabel } from '../../dist/index.js';
import { textLanguages } from '../../../core/test/fixtures/text/languages.js';

const canvas = document.querySelector('canvas');
if (!canvas) {
	throw new Error('Missing stable-text canvas.');
}
const params = new URLSearchParams(location.search);
const density = Number(params.get('density') ?? 1);
canvas.width = 640 * density;
canvas.height = 360 * density;
if (params.get('backend') === 'canvas') {
	canvas.getContext('2d');
}
Capabilities._init();
const player = new Player(canvas);
player.updateStageSize(640, 360, canvas.width, canvas.height);
const root = new Sprite();
player.stage.addChild(root);

function check(condition: boolean, message: string): void {
	if (!condition) {
		throw new Error(message);
	}
}

function close(actual: number, expected: number, message: string): void {
	check(Math.abs(actual - expected) < 0.001, `${message}: ${actual} vs ${expected}`);
}

function fieldOf(label: Label | RichLabel): TextField {
	const field = label.getChildAt(0);
	if (!(field instanceof TextField)) {
		throw new Error('Missing native TextField.');
	}
	return field;
}

function validate(label: Label | RichLabel): TextField {
	label.validateNow();
	return fieldOf(label);
}

function createLabel(family: string): Label {
	root.removeChildren();
	const label = new Label();
	label.x = label.y = 30;
	label.fontFamily = family;
	label.size = 24;
	label.stroke = 2;
	label.minFontSize = 6;
	label.textColor = 0xffffff;
	label.strokeColor = 0xff3399;
	root.addChild(label);
	return label;
}

function runLanguage(code: string, family: string): { prefixes: number; rows: number; fitted: number } {
	const language = textLanguages.find(item => item.code === code);
	if (!language) {
		throw new Error(`Unknown text fixture ${code}.`);
	}
	const label = createLabel(family);
	label.multiline = false;
	let naturalHeight = 0;
	for (const alignment of ['top', 'middle', 'bottom']) {
		label.verticalAlign = alignment;
		let previousBaseline: number | undefined;
		let fixedBaseline: number | undefined;
		for (const text of language.variants) {
			label.text = text;
			const field = validate(label);
			const row = field.getLinesArr()[0];
			const baseline = field.y + row.baseline;
			if (previousBaseline !== undefined) {
				close(baseline, previousBaseline, `${code}/${alignment} automatic baseline`);
				close(label.height, naturalHeight, `${code} automatic height`);
			}
			previousBaseline = baseline;
			naturalHeight = label.height;
			close(label.height, field.textHeight + 8, `${code} font frame plus outline`);
			label.width = 560;
			label.height = 80;
			validate(label);
			const aligned =
				field.y +
				row.baseline +
				(field.height - field.textHeight) * (alignment === 'top' ? 0 : alignment === 'middle' ? 0.5 : 1);
			if (fixedBaseline !== undefined) {
				close(aligned, fixedBaseline, `${code}/${alignment} fixed baseline`);
			}
			fixedBaseline = aligned;
			// Automatic and fixed frames are checked separately on the next variant.
			label.width = NaN;
			label.height = NaN;
		}
	}
	label.verticalAlign = 'top';
	label.multiline = true;
	label.wordWrap = true;
	label.width = 150;
	label.lineSpacing = 3;
	label.text = `${language.text} ${language.text}`;
	const field = validate(label);
	const rows = field.numLines;
	check(rows > 1, `${code} must wrap`);
	const expectedHeight =
		field.getLinesArr().reduce((height, line) => height + line.height, 0) + (rows - 1) * label.lineSpacing + 8;
	close(label.height, expectedHeight, `${code} complete wrapped height`);
	let firstBaseline: number | undefined;
	let prefixes = 0;
	for (let pass = 0; pass < 2; pass++) {
		label.text = '';
		validate(label);
		for (const character of Array.from(language.text)) {
			label.text += character;
			validate(label);
			const baseline = field.y + field.getLinesArr()[0].baseline;
			firstBaseline ??= baseline;
			close(baseline, firstBaseline, `${code} typewriter baseline`);
			prefixes++;
		}
	}
	label.text = language.text;
	label.height = Math.min(58, naturalHeight - 1);
	label.textFit = 'shrink';
	validate(label);
	const fitted = label.renderedSize;
	check(fitted < label.size, `${code} constrained paragraph must shrink`);
	check(!label.textFitOverflow, `${code} paragraph should fit`);
	check(field.textWidth <= field.width + 0.01 && field.textHeight <= field.height + 0.01, `${code} fitted bounds`);
	player.render(false, 0);
	label.width = 560;
	label.height = 180;
	validate(label);
	close(label.renderedSize, 24, `${code} size recovery`);
	check(label.size === 24, `${code} authored size remains intact`);
	const rich = new RichLabel();
	rich.size = 24;
	rich.fontFamily = family;
	rich.textFlow = [{ text: language.variants[0] }, { text: '\n\n' }, { text: language.variants[1] }];
	root.addChild(rich);
	const richField = validate(rich);
	check(richField.numLines === 3, `${code} rich blank row`);
	close(rich.height, richField.textHeight, `${code} rich automatic height`);
	return { prefixes, rows, fitted };
}

declare global {
	interface Window {
		stableText: { runLanguage: typeof runLanguage; webgl: boolean };
	}
}
window.stableText = { runLanguage, webgl: player.isWebGL };
