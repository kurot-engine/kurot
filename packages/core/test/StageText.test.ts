import { afterEach, describe, expect, it } from 'vitest';
import { Sprite, Stage, TextField } from '../src/index.js';
import { StageText } from '../src/kurot/text/StageText.js';

describe('StageText DOM overlay', () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	it('copies the TextField geometry, transform, and typography to the native input', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 640;
		canvas.height = 480;
		Object.defineProperties(canvas, {
			clientWidth: { value: 320 },
			clientHeight: { value: 240 },
			clientLeft: { value: 2 },
			clientTop: { value: 3 },
		});
		canvas.getBoundingClientRect = () => ({
			x: 100, y: 50, left: 100, top: 50, right: 420, bottom: 290,
			width: 320, height: 240, toJSON: () => ({}),
		});
		document.body.appendChild(canvas);

		const parent = new Sprite();
		parent.x = 20;
		parent.y = 30;
		parent.scaleX = 2;
		parent.scaleY = 1.5;
		const field = new TextField();
		field.x = 10;
		field.y = 8;
		field.width = 100;
		field.height = 24;
		field.size = 18;
		field.fontFamily = 'Arial';
		field.verticalAlign = 'middle';
		parent.addChild(field);

		const stageText = new StageText();
		stageText.setTextField(field);
		stageText.show();

		const input = document.querySelector('input')!;
		const wrapper = input.parentElement as HTMLDivElement;
		const matrix = field.$getConcatenatedMatrix();
		expect(wrapper.style.left).toBe('102px');
		expect(wrapper.style.top).toBe('53px');
		expect(wrapper.style.transform).toBe(
			`matrix(${matrix.a * 0.5},${matrix.b * 0.5},${matrix.c * 0.5},${matrix.d * 0.5},${matrix.tx * 0.5},${matrix.ty * 0.5})`,
		);
		expect(wrapper.style.width).toBe('100px');
		expect(wrapper.style.height).toBe('24px');
		expect(input.style.width).toBe('100px');
		expect(input.style.height).toBe('18px');
		expect(input.style.top).toBe('3px');
		expect(input.style.fontSize).toBe('18px');
		expect(input.style.fontFamily).toBe('Arial');
		expect(input.style.padding).toBe('0px');
		expect(input.style.boxSizing).toBe('border-box');
		expect(input.style.opacity).toBe('0');
	});

	it('positions native input from logical stage size instead of backing-store pixels', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 1280;
		canvas.height = 960;
		Object.defineProperties(canvas, {
			clientWidth: { value: 320 },
			clientHeight: { value: 240 },
			clientLeft: { value: 0 },
			clientTop: { value: 0 },
		});
		canvas.getBoundingClientRect = () => ({
			x: 0, y: 0, left: 0, top: 0, right: 320, bottom: 240,
			width: 320, height: 240, toJSON: () => ({}),
		});
		document.body.appendChild(canvas);

		const stage = new Stage();
		stage.resize(640, 480);
		const field = new TextField();
		field.x = 20;
		field.y = 10;
		field.width = 100;
		field.height = 30;
		stage.addChild(field);

		const stageText = new StageText();
		stageText.setTextField(field);
		stageText.show();

		const wrapper = document.querySelector('input')!.parentElement as HTMLDivElement;
		expect(wrapper.style.transform).toBe('matrix(0.5,0,0,0.5,10,5)');
	});

	it('publishes native text and selection while keeping the DOM editor invisible', () => {
		const field = new TextField();
		field.width = 160;
		field.height = 30;
		const stageText = new StageText();
		stageText.setTextField(field);
		stageText.setText('Hello');

		let textUpdates = 0;
		let selectionUpdates = 0;
		stageText.addEventListener('updateText', () => textUpdates++);
		stageText.addEventListener('updateSelection', () => selectionUpdates++);
		stageText.show();

		const input = document.querySelector('input')!;
		input.value = 'Hello!';
		input.setSelectionRange(2, 5);
		input.dispatchEvent(new globalThis.Event('input'));

		expect(stageText.getText()).toBe('Hello!');
		expect(stageText.getSelection()).toEqual([2, 5]);
		expect(textUpdates).toBe(1);
		expect(selectionUpdates).toBeGreaterThanOrEqual(1);
		expect(input.style.opacity).toBe('0');
	});

	it('publishes the native textarea pixel scroll position', () => {
		const field = new TextField();
		field.multiline = true;
		field.width = 160;
		field.height = 60;
		const stageText = new StageText();
		stageText.setTextField(field);
		stageText.show();

		let scrollUpdates = 0;
		stageText.addEventListener('updateScroll', () => scrollUpdates++);
		const textarea = document.querySelector('textarea')!;
		textarea.scrollTop = 17.5;
		textarea.dispatchEvent(new globalThis.Event('scroll'));

		expect(stageText.getScrollTop()).toBe(17.5);
		expect(scrollUpdates).toBe(1);
		expect(textarea.style.overflowY).toBe('auto');
		expect(textarea.style.opacity).toBe('0');
	});
});
