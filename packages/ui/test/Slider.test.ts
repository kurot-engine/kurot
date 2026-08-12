/**
 * Slider (SliderBase / HSlider / VSlider) regression tests.
 *
 * Covers the egret-parity fixes:
 * - default `maximum` is 10 (not 100)
 * - `Event.CHANGE` dispatched on interaction (track tap, thumb drag)
 * - `UIEvent.CHANGE_START` / `CHANGE_END` bracket the drag lifecycle
 * - `liveDragging` defaults to true; pendingValue defers commit when false
 * - HSlider/VSlider override pointToValue with track bounds
 */
import { describe, it, expect } from 'vitest';
import { HSlider, VSlider, UIEvent, Rect } from '../src/index.js';

// Minimal fake touch event for simulating interaction.
function fakeTouch(stageX: number, stageY: number): any {
	return { stopPropagation: () => {}, stageX, stageY, touchPointID: 0 };
}

// Reach the protected interaction handlers without repeating the cast.
function handlers(s: HSlider | VSlider): {
	thumbDown: (e: any) => void;
	thumbUp: (e: any) => void;
	trackDown: (e: any) => void;
	pointToValue: (x: number, y: number) => number;
	updateSkinDisplayList: () => void;
} {
	const h = s as any;
	return {
		thumbDown: h._onThumbDown.bind(s),
		thumbUp: h._onThumbUp.bind(s),
		trackDown: h._onTrackDown.bind(s),
		pointToValue: h.pointToValue.bind(s),
		updateSkinDisplayList: h.updateSkinDisplayList.bind(s),
	};
}

describe('Slider', () => {
	describe('defaults', () => {
		it('HSlider defaults to maximum=10 (egret parity)', () => {
			const s = new HSlider();
			expect(s.maximum).toBe(10);
			expect(s.minimum).toBe(0);
		});

		it('VSlider defaults to maximum=10', () => {
			const s = new VSlider();
			expect(s.maximum).toBe(10);
		});

		it('liveDragging defaults to true', () => {
			expect(new HSlider().liveDragging).toBe(true);
		});
	});

	describe('Event.CHANGE dispatch', () => {
		it('programmatic value set does NOT dispatch CHANGE', () => {
			const s = new HSlider();
			let count = 0;
			s.addEventListener('change', () => count++);
			s.value = 5;
			expect(count).toBe(0);
		});

		it('track tap dispatches CHANGE when value changes', () => {
			const s = new HSlider();
			s.width = 100;

			// Mock track: globalToLocal returns the stage coords directly.
			const track = new Rect(100, 10, 0xff0000);
			track.width = 100;
			(track as unknown as { globalToLocal: (x: number, y: number) => { x: number; y: number } }).globalToLocal = (
				x,
				y,
			) => ({ x, y });
			// Mock thumb so _getThumbRange works.
			const thumb = new Rect(20, 20, 0x00ff00);
			thumb.width = 20;
			(thumb as unknown as { getLayoutBounds: (b: unknown) => void }).getLayoutBounds = (b: unknown) => {
				const r = b as { width: number; height: number; x: number; y: number };
				r.width = 20;
				r.height = 20;
				r.x = 0;
				r.y = 0;
			};
			(track as unknown as { getLayoutBounds: (b: unknown) => void }).getLayoutBounds = (b: unknown) => {
				const r = b as { width: number; height: number; x: number; y: number };
				r.width = 100;
				r.height = 10;
				r.x = 0;
				r.y = 0;
			};

			s.track = track;
			s.thumb = thumb;

			let count = 0;
			s.addEventListener('change', () => count++);

			handlers(s).trackDown(fakeTouch(100, 0));
			expect(s.value).toBe(10); // thumbRange=80, x=100 → clamped to max
			expect(count).toBe(1);

			// Same position → no change → no extra CHANGE.
			handlers(s).trackDown(fakeTouch(100, 0));
			expect(count).toBe(1);
		});
	});

	describe('CHANGE_START / CHANGE_END lifecycle', () => {
		it('thumb down → CHANGE_START; thumb up → CHANGE_END', () => {
			const s = new HSlider();
			let startCount = 0;
			let endCount = 0;
			s.addEventListener(UIEvent.CHANGE_START, () => startCount++);
			s.addEventListener(UIEvent.CHANGE_END, () => endCount++);

			const h = handlers(s);

			h.thumbDown(fakeTouch(0, 0));
			expect(startCount).toBe(1);

			h.thumbUp({});
			expect(endCount).toBe(1);
		});

		it('CHANGE_START and CHANGE_END only fire on thumb interaction, not track tap', () => {
			const s = new HSlider();
			s.width = 100;
			let startCount = 0;
			let endCount = 0;
			s.addEventListener(UIEvent.CHANGE_START, () => startCount++);
			s.addEventListener(UIEvent.CHANGE_END, () => endCount++);

			handlers(s).trackDown(fakeTouch(50, 0));
			expect(startCount).toBe(0);
			expect(endCount).toBe(0);
		});
	});

	describe('liveDragging=false defers CHANGE to release', () => {
		it('pendingValue tracks during drag, value commits on release', () => {
			const s = new HSlider();
			s.liveDragging = false;
			s.width = 100;

			let count = 0;
			s.addEventListener('change', () => count++);

			const h = handlers(s);

			h.thumbDown(fakeTouch(0, 0));
			// Programmatic pendingValue change (simulating move).
			s.pendingValue = 7;
			expect(s.value).toBe(0); // not committed
			expect(count).toBe(0); // no CHANGE yet

			h.thumbUp({});
			expect(s.value).toBe(7); // committed on release
			expect(count).toBe(1);
		});
	});

	describe('pointToValue (HSlider track bounds)', () => {
		it('HSlider.pointToValue maps x to value using thumbRange', () => {
			const s = new HSlider();
			const track = new Rect(100, 10, 0xff);
			const thumb = new Rect(20, 10, 0x00ff00);
			(track as unknown as { getLayoutBounds: (b: unknown) => void }).getLayoutBounds = (b: unknown) => {
				const r = b as { width: number; height: number; x: number; y: number };
				r.width = 100;
				r.height = 10;
				r.x = 0;
				r.y = 0;
			};
			(thumb as unknown as { getLayoutBounds: (b: unknown) => void }).getLayoutBounds = (b: unknown) => {
				const r = b as { width: number; height: number; x: number; y: number };
				r.width = 20;
				r.height = 10;
				r.x = 0;
				r.y = 0;
			};
			s.track = track;
			s.thumb = thumb;

			// thumbRange = 100 - 20 = 80; range = 10 - 0 = 10
			// x=0 → value 0; x=80 → value 10; x=40 → value 5
			expect(handlers(s).pointToValue(0, 0)).toBe(0);
			expect(handlers(s).pointToValue(80, 0)).toBe(10);
			expect(handlers(s).pointToValue(40, 0)).toBe(5);
		});
	});

	describe('thumb positioning includes track offset', () => {
		it('HSlider positions minimum and maximum at the track edges', () => {
			const slider = new HSlider();
			const track = new Rect(100, 6, 0xff);
			const thumb = new Rect(20, 20, 0xff);
			track.getLayoutBounds = bounds => bounds.setTo(10, 0, 100, 6);
			thumb.getLayoutBounds = bounds => bounds.setTo(0, 0, 20, 20);
			slider.track = track;
			slider.thumb = thumb;
			slider.minimum = 0;
			slider.maximum = 10;

			slider.value = 0;
			slider.validateProperties();
			handlers(slider).updateSkinDisplayList();
			expect(thumb.x).toBe(10);

			slider.value = 10;
			slider.validateProperties();
			handlers(slider).updateSkinDisplayList();
			expect(thumb.x).toBe(90);
		});

		it('VSlider positions maximum at top and minimum at bottom of an offset track', () => {
			const slider = new VSlider();
			const track = new Rect(6, 100, 0xff);
			const thumb = new Rect(20, 20, 0xff);
			track.getLayoutBounds = bounds => bounds.setTo(0, 10, 6, 100);
			thumb.getLayoutBounds = bounds => bounds.setTo(0, 0, 20, 20);
			slider.track = track;
			slider.thumb = thumb;
			slider.minimum = 0;
			slider.maximum = 10;

			slider.value = 10;
			slider.validateProperties();
			handlers(slider).updateSkinDisplayList();
			expect(thumb.y).toBe(10);

			slider.value = 0;
			slider.validateProperties();
			handlers(slider).updateSkinDisplayList();
			expect(thumb.y).toBe(90);
		});
	});
});
