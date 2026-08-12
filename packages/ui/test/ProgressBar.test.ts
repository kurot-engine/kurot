/**
 * ProgressBar logic regression tests.
 *
 * Covers two areas:
 * - Numeric logic for value / ratio / label (clamping, CHANGE dispatch, labelFunction)
 * - thumb clipping in updateDisplayList: aligns with Egret by using scrollRect
 *   to reveal the progress portion instead of overwriting thumb.width.
 *   The old implementation (thumb.width = unscaledWidth * ratio) tied the thumb
 *   size to the host's external width and broke rendering of percent-width children.
 *
 * Note: actual rendering (TextPipe / WebGL) is out of scope; only logic is verified.
 */
import { describe, it, expect } from 'vitest';
import { ProgressBar, Rect, Label } from '../src/index.js';

describe('ProgressBar', () => {
	// ── value / clamp / CHANGE ────────────────────────────────────────────
	describe('value', () => {
		it('clamps to [minimum, maximum]', () => {
			const pb = new ProgressBar();
			pb.minimum = 0;
			pb.maximum = 100;

			pb.value = 50;
			expect(pb.value).toBe(50);

			pb.value = 999;
			expect(pb.value).toBe(100);

			pb.value = -5;
			expect(pb.value).toBe(0);
		});

		it('dispatches change on value change, not on identical value', () => {
			const pb = new ProgressBar();
			pb.minimum = 0;
			pb.maximum = 100;
			pb.value = 50;

			let count = 0;
			pb.addEventListener('change', () => count++);

			pb.value = 30;
			expect(count).toBe(1);

			pb.value = 30; // identical
			expect(count).toBe(1);

			pb.value = 60;
			expect(count).toBe(2);
		});

		it('pulls value back to the lower bound when minimum is raised', () => {
			const pb = new ProgressBar();
			pb.minimum = 0;
			pb.maximum = 100;
			pb.value = 50;
			pb.minimum = 60; // value(50) < new minimum
			expect(pb.value).toBe(60);
		});
	});

	// ── ratio ─────────────────────────────────────────────────────────────
	describe('ratio', () => {
		it('computes (value - minimum) / (maximum - minimum)', () => {
			const pb = new ProgressBar();
			pb.minimum = 0;
			pb.maximum = 100;

			pb.value = 0;
			expect(pb.ratio).toBe(0);
			pb.value = 50;
			expect(pb.ratio).toBe(0.5);
			pb.value = 100;
			expect(pb.ratio).toBe(1);
		});

		it('works with a non-zero minimum', () => {
			const pb = new ProgressBar();
			pb.minimum = 20;
			pb.maximum = 120;
			pb.value = 70; // (70-20)/(120-20) = 0.5
			expect(pb.ratio).toBe(0.5);
		});

		it('returns 0 when range <= 0 (no division by zero)', () => {
			const pb = new ProgressBar();
			pb.minimum = 100;
			pb.maximum = 100;
			expect(pb.ratio).toBe(0);
		});
	});

	// ── label ─────────────────────────────────────────────────────────────
	describe('labelDisplay', () => {
		it('defaults to the "value / maximum" format', () => {
			const pb = new ProgressBar();
			pb.minimum = 0;
			pb.maximum = 100;
			pb.value = 42;

			const lbl = new Label();
			pb.labelDisplay = lbl;

			pb.updateDisplayList(200, 10);
			expect(lbl.text).toBe('42 / 100');
		});

		it('labelFunction overrides the default format', () => {
			const pb = new ProgressBar();
			pb.minimum = 0;
			pb.maximum = 100;
			pb.value = 42;

			const lbl = new Label();
			pb.labelDisplay = lbl;
			pb.labelFunction = (v, m) => `${Math.round((v / m) * 100)}%`;

			pb.updateDisplayList(200, 10);
			expect(lbl.text).toBe('42%');
		});
	});

	// ── thumb scrollRect clipping (core: aligns with Egret, does not resize thumb) ─
	describe('thumb clipping', () => {
		it('does not overwrite the thumb width (regression guard for the old bug)', () => {
			const pb = new ProgressBar();
			pb.minimum = 0;
			pb.maximum = 100;
			pb.value = 50;

			const thumb = new Rect(200, 10, 0xff0000);
			pb.thumb = thumb;

			pb.updateDisplayList(296, 10); // external width 296 differs from thumb width 200

			// Key: thumb width must stay 200 (skin/external), not be overwritten by unscaledWidth
			expect(thumb.width).toBe(200);
		});

		it('LTR: clips the progress portion from the left', () => {
			const pb = new ProgressBar();
			pb.minimum = 0;
			pb.maximum = 100;
			pb.value = 50; // ratio 0.5
			pb.direction = 'ltr';

			const thumb = new Rect(200, 10, 0xff0000);
			pb.thumb = thumb;

			pb.updateDisplayList(200, 10);

			expect(thumb.scrollRect?.x).toBe(0);
			expect(thumb.scrollRect?.width).toBe(100);
			expect(thumb.scrollRect?.height).toBe(10);
		});

		it('RTL: clips the progress portion from the right and positions', () => {
			const pb = new ProgressBar();
			pb.minimum = 0;
			pb.maximum = 100;
			pb.value = 50; // ratio 0.5
			pb.direction = 'rtl';

			const thumb = new Rect(200, 10, 0xff0000);
			pb.thumb = thumb;

			pb.updateDisplayList(200, 10);

			expect(thumb.scrollRect?.x).toBe(100); // 200 - 100
			expect(thumb.scrollRect?.width).toBe(100);
			expect(thumb.x).toBe(100);
		});

		it('TTB: clips vertically from the top', () => {
			const pb = new ProgressBar();
			pb.minimum = 0;
			pb.maximum = 100;
			pb.value = 25; // ratio 0.25
			pb.direction = 'ttb';

			const thumb = new Rect(10, 100, 0xff0000);
			pb.thumb = thumb;

			pb.updateDisplayList(10, 100);

			expect(thumb.scrollRect?.y).toBe(0);
			expect(thumb.scrollRect?.height).toBe(25);
			expect(thumb.scrollRect?.width).toBe(10);
		});

		it('BTT: clips vertically from the bottom and positions', () => {
			const pb = new ProgressBar();
			pb.minimum = 0;
			pb.maximum = 100;
			pb.value = 25; // ratio 0.25
			pb.direction = 'btt';

			const thumb = new Rect(10, 100, 0xff0000);
			pb.thumb = thumb;

			pb.updateDisplayList(10, 100);

			expect(thumb.scrollRect?.y).toBe(75); // 100 - 25
			expect(thumb.scrollRect?.height).toBe(25);
			expect(thumb.y).toBe(75);
		});

		it('clips to an empty segment (width 0) at ratio 0 without throwing', () => {
			const pb = new ProgressBar();
			pb.minimum = 0;
			pb.maximum = 100;
			pb.value = 0;

			const thumb = new Rect(200, 10, 0xff0000);
			pb.thumb = thumb;

			pb.updateDisplayList(200, 10);

			expect(thumb.scrollRect?.width).toBe(0);
		});
	});
});
