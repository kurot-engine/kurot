import { describe, it, expect, vi } from 'vitest';
import { Event, TouchEvent } from '@kurot/core';
import { Scroller, Group, HScrollBar, VScrollBar } from '../src/index.js';
import { attachSkin } from './helpers/skin.js';

describe('Scroller', () => {
	describe('scroll bar visibility', () => {
		it('preserves bars hidden by the skin while the viewport remains scrollable', () => {
			const scroller = new Scroller();
			const viewport = new Group();
			const horizontalBar = new HScrollBar();
			const verticalBar = new VScrollBar();
			horizontalBar.autoVisibility = false;
			verticalBar.autoVisibility = false;
			horizontalBar.visible = false;
			verticalBar.visible = false;
			attachSkin(scroller, { horizontalScrollBar: horizontalBar, verticalScrollBar: verticalBar });
			scroller.viewport = viewport;
			vi.spyOn(viewport, 'getLayoutBounds').mockImplementation(bounds => { bounds.setTo(0, 0, 100, 100); });

			viewport.setContentSize(300, 300);
			scroller.updateDisplayList(100, 100);
			expect(horizontalBar.visible).toBe(false);
			expect(verticalBar.visible).toBe(false);
			expect(scroller.horizontalScrollPolicy).toBe('auto');
			expect(scroller.verticalScrollPolicy).toBe('auto');

			const handlers = scroller as unknown as {
				_onTouchBeginCapture: (event: Event) => void;
				_onTouchMove: (event: TouchEvent) => void;
			};
			handlers._onTouchBeginCapture(new TouchEvent(TouchEvent.TOUCH_BEGIN, true, false, 50, 50, 1));
			handlers._onTouchMove(new TouchEvent(TouchEvent.TOUCH_MOVE, true, false, 50, 70, 1));
			handlers._onTouchMove(new TouchEvent(TouchEvent.TOUCH_MOVE, true, false, 50, 90, 1));
			expect(horizontalBar.visible).toBe(false);
			expect(verticalBar.visible).toBe(false);
			expect(viewport.scrollV).toBeLessThan(0);
		});

		it('shows automatic bars only after the drag threshold', () => {
			const scroller = new Scroller();
			const viewport = new Group();
			const horizontalBar = new HScrollBar();
			const verticalBar = new VScrollBar();
			attachSkin(scroller, { horizontalScrollBar: horizontalBar, verticalScrollBar: verticalBar });
			scroller.viewport = viewport;
			vi.spyOn(viewport, 'getLayoutBounds').mockImplementation(bounds => { bounds.setTo(0, 0, 100, 100); });

			viewport.setContentSize(300, 300);
			scroller.updateDisplayList(100, 100);
			expect(horizontalBar.visible).toBe(false);
			expect(verticalBar.visible).toBe(false);

			const handlers = scroller as unknown as {
				_onTouchBeginCapture: (event: Event) => void;
				_onTouchMove: (event: TouchEvent) => void;
			};
			handlers._onTouchBeginCapture(new TouchEvent(TouchEvent.TOUCH_BEGIN, true, false, 50, 50, 1));
			expect(verticalBar.visible).toBe(false);
			handlers._onTouchMove(new TouchEvent(TouchEvent.TOUCH_MOVE, true, false, 50, 70, 1));
			expect(horizontalBar.visible).toBe(true);
			expect(verticalBar.visible).toBe(true);
		});
	});

	describe('viewport display-list management', () => {
		it('adds the viewport as a child of the scroller on assignment', () => {
			const scroller = new Scroller();
			const viewport = new Group();
			scroller.viewport = viewport;
			expect(scroller.getChildIndex(viewport)).toBe(0);
		});

		it('removes the previous viewport when a new one is assigned', () => {
			const scroller = new Scroller();
			const vp1 = new Group();
			const vp2 = new Group();
			scroller.viewport = vp1;
			scroller.viewport = vp2;
			expect(scroller.contains(vp1)).toBe(false);
			expect(scroller.contains(vp2)).toBe(true);
		});

		it('removes the viewport from the scroller on reset to undefined', () => {
			const scroller = new Scroller();
			const viewport = new Group();
			scroller.viewport = viewport;
			scroller.viewport = undefined;
			expect(scroller.contains(viewport)).toBe(false);
		});

		it('binds a viewport assigned after the scroll bar skin parts', () => {
			const scroller = new Scroller();
			const horizontalBar = new HScrollBar();
			const verticalBar = new VScrollBar();
			attachSkin(scroller, { horizontalScrollBar: horizontalBar, verticalScrollBar: verticalBar });
			const viewport = new Group();

			scroller.viewport = viewport;

			expect(horizontalBar.viewport).toBe(viewport);
			expect(verticalBar.viewport).toBe(viewport);
		});

		it('unbinds scroll bars when the viewport is removed', () => {
			const scroller = new Scroller();
			const horizontalBar = new HScrollBar();
			const verticalBar = new VScrollBar();
			attachSkin(scroller, { horizontalScrollBar: horizontalBar, verticalScrollBar: verticalBar });
			scroller.viewport = new Group();

			scroller.viewport = undefined;

			expect(horizontalBar.viewport).toBeUndefined();
			expect(verticalBar.viewport).toBeUndefined();
		});

		it('makes scroll bar skin parts non-interactive so touches reach the viewport', () => {
			const scroller = new Scroller();
			const horizontalBar = new HScrollBar();
			const verticalBar = new VScrollBar();

			attachSkin(scroller, { horizontalScrollBar: horizontalBar, verticalScrollBar: verticalBar });

			expect(horizontalBar.touchEnabled).toBe(false);
			expect(horizontalBar.touchChildren).toBe(false);
			expect(verticalBar.touchEnabled).toBe(false);
			expect(verticalBar.touchChildren).toBe(false);
		});
	});
});
