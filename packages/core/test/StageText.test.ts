import { afterEach, describe, expect, it } from 'vitest';
import { Sprite, TextField } from '../src/index.js';
import { StageText } from '../src/blakron/text/StageText.js';

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
	});
});
