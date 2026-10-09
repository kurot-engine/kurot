import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TextField, TextFieldType, splitGraphemes } from '../src/index.js';
import { CanvasRenderer } from '../src/kurot/player/canvas/CanvasRenderer.js';
import { createTextMetrics } from './helpers/text-metrics.js';

const characters = ['👩‍👩‍👧‍👦', '🇨🇳', '👍🏽', 'e\u0301', 'क्ष'];

function measureText(text: string): TextMetrics {
	for (const character of characters) {
		text = text.replaceAll(character, 'x');
	}
	return createTextMetrics(text.length * 10);
}

function paintedLines(field: TextField): string[] {
	return field.getLinesArr().map(line => line.elements.map(element => element.text).join(''));
}

function wrapped(text: string, width: number, wordWrap: boolean): TextField {
	const field = new TextField();
	field.size = 20;
	field.width = width;
	field.wordWrap = wordWrap;
	field.text = text;
	return field;
}

beforeEach(() => {
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
		font: '',
		measureText,
	} as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

describe.each([true, false])('TextField grapheme protection with wordWrap=%s', wordWrap => {
	it.each(characters)('wraps around the complete character %j', character => {
		const text = `A${character}B`;
		const field = wrapped(text, 10, wordWrap);
		expect(paintedLines(field)).toEqual(['A', character, 'B']);
		expect(field.getLinesArr().map(line => line.charNum)).toEqual([1, character.length, 1]);
		expect(field.text).toBe(text);
	});

	it('allows an oversized grapheme to overflow intact and still advances the line', () => {
		const character = characters[0];
		const field = wrapped(`${character}A`, 5, wordWrap);
		expect(paintedLines(field)).toEqual([character, 'A']);
		expect(field.textWidth).toBe(10);
		expect(field.numLines).toBe(2);
	});

	it('keeps UTF-16 source lengths and hard separators after composed characters', () => {
		const family = characters[0];
		const accent = characters[3];
		const text = `A${family}B\r\n${accent}\n`;
		const field = wrapped(text, 10, wordWrap);
		expect(paintedLines(field)).toEqual(['A', family, 'B', accent, '']);
		expect(field.getLinesArr().map(line => line.charNum)).toEqual([1, family.length, 3, accent.length + 1, 0]);
		expect(field.getLinesArr().reduce((length, line) => length + line.charNum, 0)).toBe(text.length);
	});

	it('does not introduce a break where rich-text styles split a grapheme', () => {
		const character = characters[0];
		const field = wrapped('', 10, wordWrap);
		field.textFlow = [{ text: character.slice(0, 3), style: { bold: true } }, { text: character.slice(3) }];
		expect(paintedLines(field)).toEqual([character]);
		expect(field.getLinesArr()[0].charNum).toBe(character.length);
	});
});

describe('Composed-character input and public segmentation', () => {
	it('keeps continuation hit and caret offsets after a family emoji', () => {
		const character = characters[0];
		const field = wrapped(`${character}AB`, 10, true);
		field.type = TextFieldType.INPUT;
		field.multiline = true;
		field.height = 60;
		expect(paintedLines(field)).toEqual([character, 'A', 'B']);
		expect(field.$getInputIndexAt(0, 25)).toBe(character.length);
		field.setIsTyping(true);
		field.setSelection(character.length + 1, character.length + 1);
		const context = {
			save: vi.fn(),
			restore: vi.fn(),
			translate: vi.fn(),
			beginPath: vi.fn(),
			rect: vi.fn(),
			clip: vi.fn(),
			fillRect: vi.fn(),
			fillText: vi.fn(),
			strokeText: vi.fn(),
			measureText,
			font: '',
			textBaseline: 'alphabetic',
			textAlign: 'start',
			fillStyle: '',
		} as unknown as CanvasRenderingContext2D;
		new CanvasRenderer().renderTextFieldToContext(field, context, 0, 0);
		// A soft-wrap boundary retains the existing affinity to the preceding line.
		expect(context.fillRect).toHaveBeenCalledWith(10, 20, 1, 20);
		field.setSelection(field.text.length, field.text.length);
		new CanvasRenderer().renderTextFieldToContext(field, context, 0, 0);
		expect(context.fillRect).toHaveBeenLastCalledWith(10, 40, 1, 20);
	});

	it('retains complete characters in the public splitGraphemes utility', () => {
		expect(splitGraphemes(characters.join(''))).toEqual(characters);
		expect(splitGraphemes('')).toEqual([]);
	});
});
