/**
 * Scroller regression tests.
 *
 * Covers the tap-swallowing fix: when a scroll gesture is detected (touch
 * moves beyond threshold), the Scroller intercepts TOUCH_TAP in the capture
 * phase so child components (e.g. List items) don't receive a false "click".
 */
import { describe, it, expect } from 'vitest';
import { Event, TouchEvent } from '@blakron/core';
import { Scroller, Group, HScrollBar, VScrollBar } from '../src/index.js';

function attachPart(scroller: Scroller, partName: string, instance: unknown): void {
	(scroller as unknown as { partAdded: (name: string, part: unknown) => void }).partAdded(partName, instance);
}

describe('Scroller', () => {
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
			attachPart(scroller, 'horizontalScrollBar', horizontalBar);
			attachPart(scroller, 'verticalScrollBar', verticalBar);
			const viewport = new Group();

			scroller.viewport = viewport;

			expect(horizontalBar.viewport).toBe(viewport);
			expect(verticalBar.viewport).toBe(viewport);
		});

		it('unbinds scroll bars when the viewport is removed', () => {
			const scroller = new Scroller();
			const horizontalBar = new HScrollBar();
			const verticalBar = new VScrollBar();
			attachPart(scroller, 'horizontalScrollBar', horizontalBar);
			attachPart(scroller, 'verticalScrollBar', verticalBar);
			scroller.viewport = new Group();

			scroller.viewport = undefined;

			expect(horizontalBar.viewport).toBeUndefined();
			expect(verticalBar.viewport).toBeUndefined();
		});

		it('makes scroll bar skin parts non-interactive so touches reach the viewport', () => {
			const scroller = new Scroller();
			const horizontalBar = new HScrollBar();
			const verticalBar = new VScrollBar();

			attachPart(scroller, 'horizontalScrollBar', horizontalBar);
			attachPart(scroller, 'verticalScrollBar', verticalBar);

			expect(horizontalBar.touchEnabled).toBe(false);
			expect(horizontalBar.touchChildren).toBe(false);
			expect(verticalBar.touchEnabled).toBe(false);
			expect(verticalBar.touchChildren).toBe(false);
		});
	});

	describe('tap swallowing during scroll', () => {
		it('swallows TOUCH_TAP when touch moves beyond threshold (scroll)', () => {
			const scroller = new Scroller();

			// Build a viewport with content larger than bounds (scrollable).
			const viewport = new Group();
			viewport.scrollEnabled = true;
			// Mock content size > viewport size so _canScroll returns true.
			Object.defineProperty(viewport, 'contentWidth', { value: 500 });
			Object.defineProperty(viewport, 'contentHeight', { value: 500 });
			viewport.width = 100;
			viewport.height = 100;
			// Mock getLayoutBounds to return viewport size.
			(viewport as unknown as { getLayoutBounds: (b: unknown) => void }).getLayoutBounds = (b: unknown) => {
				const r = b as { width: number; height: number };
				r.width = 100;
				r.height = 100;
			};

			scroller.viewport = viewport;

			// Track whether a child would receive the tap.
			let childGotTap = false;
			viewport.addEventListener(TouchEvent.TOUCH_TAP, () => {
				childGotTap = true;
			});

			// Simulate touch: begin → move (scroll) → end → tap.
			const h = (scroller as unknown as {
				_onTouchBeginCapture: (e: Event) => void;
				_onTouchMove: (e: TouchEvent) => void;
				_onTouchEndCapture: (e: Event) => void;
				_onTouchTapCapture: (e: Event) => void;
				_onTouchEnd: (e: TouchEvent) => void;
			});

			// Touch begin.
			h._onTouchBeginCapture({
				type: 'touchBegin',
				touchPointID: 0,
				stageX: 50,
				stageY: 50,
				stopPropagation: () => {},
				target: viewport,
			} as unknown as Event);

			// Move beyond threshold (triggers scroll → _touchCancelled = true).
			h._onTouchMove({
				touchPointID: 0,
				stageX: 50,
				stageY: 80, // moved 30px, > DEFAULT_THRESHOLD (8)
			} as unknown as TouchEvent);

			// Now dispatch a tap — capture handler should swallow it.
			const tapEvent = {
				type: 'touchTap',
				stopPropagation() {
					(this as unknown as { _stopped: boolean })._stopped = true;
				},
				_stopped: false,
			};
			h._onTouchTapCapture(tapEvent as unknown as Event);
			expect((tapEvent as unknown as { _stopped: boolean })._stopped).toBe(true);
		});

		it('does NOT swallow tap when touch stays within threshold (no scroll)', () => {
			const scroller = new Scroller();

			const viewport = new Group();
			viewport.scrollEnabled = true;
			Object.defineProperty(viewport, 'contentWidth', { value: 500 });
			Object.defineProperty(viewport, 'contentHeight', { value: 500 });
			viewport.width = 100;
			viewport.height = 100;
			(viewport as unknown as { getLayoutBounds: (b: unknown) => void }).getLayoutBounds = (b: unknown) => {
				const r = b as { width: number; height: number };
				r.width = 100;
				r.height = 100;
			};

			scroller.viewport = viewport;

			const h = (scroller as unknown as {
				_onTouchBeginCapture: (e: Event) => void;
				_onTouchMove: (e: TouchEvent) => void;
				_onTouchTapCapture: (e: Event) => void;
			});

			// Touch begin.
			h._onTouchBeginCapture({
				type: 'touchBegin',
				touchPointID: 0,
				stageX: 50,
				stageY: 50,
				stopPropagation: () => {},
				target: viewport,
			} as unknown as Event);

			// Move within threshold (no scroll).
			h._onTouchMove({
				touchPointID: 0,
				stageX: 50,
				stageY: 53, // moved 3px, < threshold
			} as unknown as TouchEvent);

			// Tap should NOT be swallowed.
			const tapEvent = {
				type: 'touchTap',
				stopPropagation() {
					(this as unknown as { _stopped: boolean })._stopped = true;
				},
				_stopped: false,
			};
			h._onTouchTapCapture(tapEvent as unknown as Event);
			expect((tapEvent as unknown as { _stopped: boolean })._stopped).toBe(false);
		});
	});
});
