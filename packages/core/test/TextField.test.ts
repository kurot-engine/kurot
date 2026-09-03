import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Stage, TextField, TextFieldType, TouchEvent } from '../src/index.js';
import { CanvasRenderer } from '../src/kurot/player/canvas/CanvasRenderer.js';

describe('TextField line layout', () => {
	beforeEach(() => {
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
			font: '',
			measureText: (text: string) => ({ width: text.length * 10 }),
		} as unknown as CanvasRenderingContext2D);
	});

	afterEach(() => {
		document.body.replaceChildren();
		vi.restoreAllMocks();
	});

	it('wraps width-constrained dynamic text when multiline is false', () => {
		const field = new TextField();
		field.width = 40;
		field.size = 20;
		field.multiline = false;
		field.wordWrap = false;
		field.text = 'This is wider than forty pixels';

		expect(field.numLines).toBeGreaterThan(1);
		expect(field.textHeight).toBeGreaterThan(field.size);
	});

	it('does not wrap width-constrained single-line input', () => {
		const field = new TextField();
		field.type = TextFieldType.INPUT;
		field.width = 40;
		field.size = 20;
		field.multiline = false;
		field.wordWrap = true;
		field.text = 'This is wider than forty pixels';

		expect(field.numLines).toBe(1);
		expect(field.textHeight).toBe(field.size);
	});

	it('wraps width-constrained multiline input', () => {
		const field = new TextField();
		field.type = TextFieldType.INPUT;
		field.width = 40;
		field.size = 20;
		field.multiline = true;
		field.wordWrap = true;
		field.text = 'This is wider than forty pixels';

		expect(field.numLines).toBeGreaterThan(1);
	});

	it('preserves the empty line after a trailing line break', () => {
		const field = new TextField();
		field.multiline = true;
		field.text = 'First line\n';

		expect(field.numLines).toBe(2);
	});

	it('normalizes non-string runtime values before line layout', () => {
		const field = new TextField();
		field.text = { label: 'Button' } as unknown as string;

		expect(field.text).toBe('[object Object]');
		expect(() => field.textWidth).not.toThrow();

		field.text = null as unknown as string;
		expect(field.text).toBe('');
	});

	it('supports automatic and explicit text raster resolution', () => {
		const field = new TextField();

		expect(field.resolution).toBeUndefined();
		field.resolution = 2;
		expect(field.resolution).toBe(2);
		field.resolution = 0;
		expect(field.resolution).toBe(1);
		field.resolution = undefined;
		expect(field.resolution).toBeUndefined();
	});

	it('synchronizes input text and selection into the TextField render state', () => {
		const stage = new Stage();
		const field = new TextField();
		field.type = TextFieldType.INPUT;
		field.text = 'Hello';
		stage.addChild(field);

		field.setSelection(1, 3);
		const input = document.querySelector('input')!;
		expect(input.selectionStart).toBe(1);
		expect(input.selectionEnd).toBe(3);

		input.value = 'Hello!';
		input.setSelectionRange(6, 6);
		input.dispatchEvent(new globalThis.Event('input'));

		expect(field.text).toBe('Hello!');
		expect(field.selectionBeginIndex).toBe(6);
		expect(field.selectionEndIndex).toBe(6);
	});

	it('focuses the native editor after a completed tap', () => {
		const stage = new Stage();
		const field = new TextField();
		field.type = TextFieldType.INPUT;
		field.width = 160;
		field.height = 30;
		stage.addChild(field);

		TouchEvent.dispatchTouchEvent(field, TouchEvent.TOUCH_BEGIN, true, true, 10, 10, 0, true);
		expect(document.activeElement).not.toBe(document.querySelector('input'));

		TouchEvent.dispatchTouchEvent(field, TouchEvent.TOUCH_TAP, true, true, 10, 10, 0, false);
		expect(document.activeElement).toBe(document.querySelector('input'));
	});

	it('renders composition text before applying restrict at composition end', () => {
		const stage = new Stage();
		const field = new TextField();
		field.type = TextFieldType.INPUT;
		field.restrict = '0-9';
		stage.addChild(field);

		const input = document.querySelector('input')!;
		input.dispatchEvent(new globalThis.Event('compositionstart'));
		input.value = '1a';
		input.setSelectionRange(2, 2);
		input.dispatchEvent(new globalThis.Event('input'));
		expect(field.text).toBe('1a');
		expect(field.$compositionStart).toBe(0);
		expect(field.$compositionEnd).toBe(2);

		input.dispatchEvent(new globalThis.Event('compositionend'));
		expect(field.text).toBe('1');
		expect(field.$compositionStart).toBe(-1);
		expect(field.$compositionEnd).toBe(-1);
	});

	it('recreates the native editor when multiline changes', () => {
		const stage = new Stage();
		const field = new TextField();
		field.type = TextFieldType.INPUT;
		stage.addChild(field);
		expect(document.querySelector('input')).not.toBeNull();

		field.multiline = true;
		field.maxChars = 12;
		const textarea = document.querySelector('textarea');
		expect(textarea).not.toBeNull();
		expect(textarea?.maxLength).toBe(12);
	});

	it('keeps the single-line caret inside the visible width', () => {
		const field = new TextField();
		field.type = TextFieldType.INPUT;
		field.width = 30;
		field.text = 'Hello';
		field.setIsTyping(true);
		field.setSelection(5, 5);
		expect(field.$inputScrollX).toBe(21);

		field.setSelection(0, 0);
		expect(field.$inputScrollX).toBe(0);
	});

	it('uses the native textarea pixel scroll position for multiline input rendering', () => {
		const stage = new Stage();
		const field = new TextField();
		field.type = TextFieldType.INPUT;
		field.multiline = true;
		field.width = 100;
		field.height = 40;
		field.size = 20;
		field.text = 'First\nSecond\nThird';
		stage.addChild(field);

		const textarea = document.querySelector('textarea')!;
		textarea.scrollTop = 15.5;
		textarea.dispatchEvent(new globalThis.Event('scroll'));

		expect(field.$inputScrollY).toBe(15.5);
		expect(field.scrollV).toBe(1);

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
			measureText: vi.fn((text: string) => ({ width: text.length * 10 })),
			font: '',
			textBaseline: 'alphabetic',
			textAlign: 'start',
			fillStyle: '',
		} as unknown as CanvasRenderingContext2D;

		new CanvasRenderer().renderTextFieldToContext(field, context, 0, 0);
		expect(context.fillText).toHaveBeenCalledWith('First', 0, -5.5);
		expect(context.fillText).toHaveBeenCalledWith('Second', 0, 14.5);
	});

	it('maps an initial multiline tap through the current vertical scroll position', () => {
		const field = new TextField();
		field.type = TextFieldType.INPUT;
		field.multiline = true;
		field.width = 100;
		field.height = 40;
		field.size = 20;
		field.text = 'First\nSecond\nThird';
		field.$setInputScrollY(20);

		expect(field.$getInputIndexAt(24, 5)).toBe(8);
	});

	it('clamps multiline pixel scrolling when the content becomes shorter', () => {
		const stage = new Stage();
		const field = new TextField();
		field.type = TextFieldType.INPUT;
		field.multiline = true;
		field.width = 100;
		field.height = 40;
		field.size = 20;
		field.text = 'First\nSecond\nThird';
		stage.addChild(field);

		field.$setInputScrollY(20);
		expect(field.$inputScrollY).toBe(20);

		field.text = 'First';
		expect(field.$inputScrollY).toBe(0);
		expect(field.scrollV).toBe(1);
		expect(document.querySelector('textarea')?.scrollTop).toBe(0);
	});

	it('keeps explicit scrollV within the multiline content range', () => {
		const field = new TextField();
		field.type = TextFieldType.INPUT;
		field.multiline = true;
		field.width = 100;
		field.height = 40;
		field.size = 20;
		field.text = 'First\nSecond\nThird';

		field.scrollV = 99;

		expect(field.scrollV).toBe(2);
		expect(field.$inputScrollY).toBe(20);
	});

	it('draws selection and caret from the synchronized input state', () => {
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
			measureText: vi.fn((text: string) => ({ width: text.length * 10 })),
			font: '',
			textBaseline: 'alphabetic',
			textAlign: 'start',
			fillStyle: '',
		} as unknown as CanvasRenderingContext2D;
		const field = new TextField();
		field.type = TextFieldType.INPUT;
		field.width = 100;
		field.height = 30;
		field.size = 20;
		field.text = 'Hello';
		field.setIsTyping(true);
		field.setSelection(1, 3);

		new CanvasRenderer().renderTextFieldToContext(field, context, 0, 0);
		expect(context.fillRect).toHaveBeenCalledWith(10, 0, 20, 20);

		vi.mocked(context.fillRect).mockClear();
		field.setSelection(2, 2);
		new CanvasRenderer().renderTextFieldToContext(field, context, 0, 0);
		expect(context.fillRect).toHaveBeenCalledWith(20, 0, 1, 20);

		vi.mocked(context.fillRect).mockClear();
		field.setSelection(4, 4);
		field.$setCompositionRange(1, 4);
		new CanvasRenderer().renderTextFieldToContext(field, context, 0, 0);
		expect(context.fillRect).toHaveBeenCalledWith(10, 20, 30, 1);
	});
});
