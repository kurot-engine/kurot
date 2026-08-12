import { describe, expect, it, vi } from 'vitest';
import { Stage, TouchEvent } from '@blakron/core';
import { Button, Group, HSlider, ItemRenderer, Panel, Rect, Scroller } from '../src/index.js';

function expectStageCleanup(stage: Stage, component: { dispatchEvent(event: TouchEvent): boolean }): void {
	const removeListener = vi.spyOn(stage, 'removeEventListener');
	TouchEvent.dispatchTouchEvent(component, TouchEvent.TOUCH_BEGIN, true, false, 10, 10, 1, true);
	stage.removeChild(component as never);
	expect(removeListener).toHaveBeenCalled();
}

describe('temporary Stage gesture listeners', () => {
	it('Button cleans its capture when removed during a press', () => {
		const stage = new Stage();
		const button = new Button();
		stage.addChild(button);
		expectStageCleanup(stage, button);
		expect(button.touchCaptured).toBe(false);
	});

	it('ItemRenderer cleans its capture when removed during a press', () => {
		const stage = new Stage();
		const renderer = new ItemRenderer();
		stage.addChild(renderer);
		expectStageCleanup(stage, renderer);
	});

	it('Slider cleans move, end, and cancel listeners when removed during a drag', () => {
		const stage = new Stage();
		const slider = new HSlider();
		const thumb = new Rect(20, 20, 0xffffff);
		slider.thumb = thumb;
		slider.addChild(thumb);
		stage.addChild(slider);
		const removeListener = vi.spyOn(stage, 'removeEventListener');

		TouchEvent.dispatchTouchEvent(thumb, TouchEvent.TOUCH_BEGIN, true, false, 10, 10, 1, true);
		stage.removeChild(slider);

		expect(removeListener).toHaveBeenCalledWith(TouchEvent.TOUCH_MOVE, expect.any(Function));
		expect(removeListener).toHaveBeenCalledWith(TouchEvent.TOUCH_END, expect.any(Function));
		expect(removeListener).toHaveBeenCalledWith(TouchEvent.TOUCH_CANCEL, expect.any(Function));
	});

	it('Panel cleans drag listeners when removed during a drag', () => {
		const stage = new Stage();
		const panel = new Panel();
		const moveArea = new Rect(100, 30, 0xffffff);
		panel.addChild(moveArea);
		panel.setSkinPart('moveArea', moveArea);
		stage.addChild(panel);
		const removeListener = vi.spyOn(stage, 'removeEventListener');

		TouchEvent.dispatchTouchEvent(moveArea, TouchEvent.TOUCH_BEGIN, true, false, 10, 10, 1, true);
		stage.removeChild(panel);

		expect(removeListener).toHaveBeenCalledWith(TouchEvent.TOUCH_MOVE, expect.any(Function));
		expect(removeListener).toHaveBeenCalledWith(TouchEvent.TOUCH_END, expect.any(Function));
		expect(removeListener).toHaveBeenCalledWith(TouchEvent.TOUCH_CANCEL, expect.any(Function));
	});

	it('Scroller removes listeners from its original Stage', () => {
		const stage = new Stage();
		const scroller = new Scroller();
		const viewport = new Group();
		viewport.width = 100;
		viewport.height = 100;
		Object.defineProperty(viewport, 'contentWidth', { value: 100 });
		Object.defineProperty(viewport, 'contentHeight', { value: 300 });
		scroller.viewport = viewport;
		stage.addChild(scroller);
		const removeListener = vi.spyOn(stage, 'removeEventListener');

		TouchEvent.dispatchTouchEvent(viewport, TouchEvent.TOUCH_BEGIN, true, false, 10, 10, 1, true);
		stage.removeChild(scroller);

		expect(removeListener).toHaveBeenCalledWith(TouchEvent.TOUCH_MOVE, expect.any(Function));
		expect(removeListener).toHaveBeenCalledWith(TouchEvent.TOUCH_END, expect.any(Function));
		expect(removeListener).toHaveBeenCalledWith(TouchEvent.TOUCH_CANCEL, expect.any(Function));
	});
});
