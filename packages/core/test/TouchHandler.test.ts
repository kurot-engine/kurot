import { describe, expect, it } from 'vitest';
import { Stage } from '../src/blakron/display/Stage.js';
import { TouchEvent } from '../src/blakron/events/TouchEvent.js';
import { TouchHandler } from '../src/blakron/player/TouchHandler.js';

describe('TouchHandler DOM mouse tracking', () => {
	it('ends a mouse interaction released outside the canvas', () => {
		const canvas = document.createElement('canvas');
		canvas.getBoundingClientRect = () => ({
			x: 0, y: 0, left: 0, top: 0, right: 100, bottom: 100,
			width: 100, height: 100, toJSON: () => ({}),
		});
		document.body.appendChild(canvas);
		const stage = new Stage();
		stage.resize(100, 100);
		stage.maxTouches = 1;
		const handler = new TouchHandler(stage, canvas);
		let begins = 0;
		stage.addEventListener(TouchEvent.TOUCH_BEGIN, () => begins++);

		canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, bubbles: true }));
		window.dispatchEvent(new MouseEvent('mouseup', { clientX: 150, clientY: 150 }));
		canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 20, clientY: 20, bubbles: true }));

		expect(begins).toBe(2);
		handler.dispose();
	});
});
