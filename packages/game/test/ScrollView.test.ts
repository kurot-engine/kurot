import { describe, expect, it, vi } from 'vitest';
import { Event, Sprite, Stage, TouchEvent } from '@kurot/core';
import { ScrollPolicy, ScrollView } from '../src/blakron/display/ScrollView.js';

function createScrollView(contentWidth = 100, contentHeight = 300): { stage: Stage; view: ScrollView; content: Sprite } {
	const stage = new Stage();
	const view = new ScrollView();
	view.width = 100;
	view.height = 100;
	const content = new Sprite();
	content.width = contentWidth;
	content.height = contentHeight;
	view.setContent(content);
	stage.addChild(view);
	return { stage, view, content };
}

describe('ScrollView', () => {
	it('implements AUTO policy independently for each axis', () => {
		const { view } = createScrollView();

		view.setScrollPosition(50, 50);

		expect(view.scrollLeft).toBe(0);
		expect(view.scrollTop).toBe(50);
		view.horizontalScrollPolicy = ScrollPolicy.ON;
		view.scrollLeft = 20;
		expect(view.scrollLeft).toBe(0); // ON permits interaction, but a direct position remains bounded.
	});

	it('refreshes bounds when content size changes', () => {
		const { view, content } = createScrollView(100, 100);
		expect(view.getMaxScrollTop()).toBe(0);

		content.height = 250;
		view.scrollTop = 100;

		expect(view.scrollTop).toBe(100);
		expect(view.getMaxScrollTop()).toBe(150);
	});

	it('removes listeners from the original stage when removed during a gesture', () => {
		const { stage, view } = createScrollView();
		const removeListener = vi.spyOn(stage, 'removeEventListener');
		TouchEvent.dispatchTouchEvent(view, TouchEvent.TOUCH_BEGIN, true, false, 10, 10, 1, true);

		stage.removeChild(view);

		expect(removeListener).toHaveBeenCalledWith(TouchEvent.TOUCH_MOVE, expect.any(Function));
		expect(removeListener).toHaveBeenCalledWith(TouchEvent.TOUCH_END, expect.any(Function));
		expect(removeListener).toHaveBeenCalledWith(TouchEvent.TOUCH_CANCEL, expect.any(Function));
	});

	it('converts sampled pixels/ms velocity to pixels/frame for inertia', () => {
		let now = 0;
		vi.spyOn(Date, 'now').mockImplementation(() => now);
		const { stage, view } = createScrollView();
		TouchEvent.dispatchTouchEvent(view, TouchEvent.TOUCH_BEGIN, true, false, 10, 80, 1, true);
		now = 10;
		TouchEvent.dispatchTouchEvent(stage, TouchEvent.TOUCH_MOVE, false, false, 10, 60, 1, true);
		TouchEvent.dispatchTouchEvent(stage, TouchEvent.TOUCH_END, false, false, 10, 60, 1, false);
		const before = view.scrollTop;

		now = 26;
		view.dispatchEventWith(Event.ENTER_FRAME);

		expect(view.scrollTop - before).toBeGreaterThan(10);
	});
});
