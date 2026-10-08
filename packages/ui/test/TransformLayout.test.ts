// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { Matrix, Rectangle } from '@kurot/core';
import { BasicLayout, BitmapLabel, Button, Component, Group, Image, Label, Rect, RichLabel } from '../src/index.js';

describe('UI transform layout invalidation', () => {
	it('re-centers a constrained child after state scale changes', () => {
		const parent = new Group();
		const layout = new BasicLayout();
		parent.layout = layout;
		const child = new Image();
		child.width = 330;
		child.height = 125;
		child.horizontalCenter = 0;
		child.verticalCenter = 0;
		parent.addChild(child);

		layout.updateDisplayList(330, 125);
		expect(child.x).toBe(0);
		expect(child.y).toBe(0);

		const invalidate = vi.spyOn(parent, 'invalidateDisplayList');
		child.scaleX = 0.95;
		child.scaleY = 0.95;
		expect(invalidate).toHaveBeenCalled();

		layout.updateDisplayList(330, 125);
		expect(child.x).toBe(8);
		expect(child.y).toBe(3);
	});

	it('invalidates constrained layout for rotation, skew and anchor changes', () => {
		const parent = new Group();
		parent.layout = new BasicLayout();
		const child = new Image();
		child.width = 100;
		child.height = 40;
		child.horizontalCenter = 0;
		parent.addChild(child);
		const invalidate = vi.spyOn(parent, 'invalidateDisplayList');

		child.rotation = 10;
		child.skewX = 5;
		child.skewY = 3;
		child.anchorOffsetX = 8;
		child.anchorOffsetY = 4;

		expect(invalidate).toHaveBeenCalledTimes(5);
	});

	it('invalidates constrained layout for matrix and position changes on Group', () => {
		const parent = new Group();
		parent.layout = new BasicLayout();
		const child = new Group();
		child.width = 100;
		child.height = 40;
		child.horizontalCenter = 0;
		parent.addChild(child);
		const invalidateDisplayList = vi.spyOn(parent, 'invalidateDisplayList');
		const invalidateProperties = vi.spyOn(child, 'invalidateProperties');

		child.matrix = new Matrix(0.9, 0, 0, 0.9, 0, 0);
		child.x = 12;
		child.y = 6;

		expect(invalidateDisplayList).toHaveBeenCalledTimes(3);
		expect(invalidateProperties).toHaveBeenCalledTimes(2);
	});
});

describe('transformed UI layout allocations', () => {
	it.each([Group, Component, Image, Label, RichLabel, BitmapLabel, Button, Rect])(
		'fills the allocated bounds when a %s is flipped vertically',
		Constructor => {
			const parent = new Group();
			const layout = new BasicLayout();
			parent.layout = layout;
			const child = new Constructor();
			child.width = 50;
			child.height = 50;
			child.percentWidth = 100;
			child.percentHeight = 100;
			child.left = 0;
			child.top = 0;
			child.scaleY = -1;
			parent.addChild(child);

			layout.updateDisplayList(640, 62);
			const bounds = new Rectangle();
			child.getLayoutBounds(bounds);
			expect(child.width).toBe(640);
			expect(child.height).toBe(62);
			expect(child.y).toBe(62);
			expect(bounds).toEqual(new Rectangle(0, 0, 640, 62));

			layout.updateDisplayList(360, 62);
			child.getLayoutBounds(bounds);
			expect(bounds).toEqual(new Rectangle(0, 0, 360, 62));
		},
	);

	it('fits negative scale magnitudes while preserving anchors and parent edge positions', () => {
		const child = new Image();
		child.width = 50;
		child.height = 50;
		child.anchorOffsetX = 20;
		child.anchorOffsetY = 9;
		child.scaleX = -2;
		child.scaleY = -0.5;
		child.setLayoutBoundsSize(640, 62);
		child.setLayoutBoundsPosition(12, 8);

		const bounds = new Rectangle();
		child.getLayoutBounds(bounds);
		expect([child.width, child.height]).toEqual([320, 124]);
		expect([child.anchorOffsetX, child.anchorOffsetY]).toEqual([20, 9]);
		expect(bounds).toEqual(new Rectangle(12, 8, 640, 62));
	});

	it('maps a single parent width allocation onto local height after a quarter turn', () => {
		const child = new Image();
		child.width = 50;
		child.height = 30;
		child.rotation = 90;
		child.setLayoutBoundsSize(640, NaN);
		child.setLayoutBoundsPosition(0, 0);

		const bounds = new Rectangle();
		child.getLayoutBounds(bounds);
		expect(child.width).toBe(50);
		expect(child.height).toBe(640);
		expect(bounds.width).toBeCloseTo(640);
		expect(bounds.height).toBeCloseTo(50);
		expect(bounds.x).toBeCloseTo(0);
		expect(bounds.y).toBeCloseTo(0);
	});

	it.each([new Matrix(-1.5, 0.3, 0.7, 0.9), new Matrix(Math.cos(Math.PI / 6), 0.5, -0.5, Math.cos(Math.PI / 6))])(
		'solves both allocated bounds for a mixed transform',
		matrix => {
			const child = new Image();
			child.width = 50;
			child.height = 50;
			child.matrix = matrix;
			const width = Math.abs(matrix.a) * 200 + Math.abs(matrix.c) * 100;
			const height = Math.abs(matrix.b) * 200 + Math.abs(matrix.d) * 100;
			child.setLayoutBoundsSize(width, height);
			child.setLayoutBoundsPosition(0, 0);

			const bounds = new Rectangle();
			child.getLayoutBounds(bounds);
			expect(child.width).toBeCloseTo(200);
			expect(child.height).toBeCloseTo(100);
			expect(bounds.width).toBeCloseTo(width);
			expect(bounds.height).toBeCloseTo(height);
		},
	);

	it('contains a singular rotated rectangle when both requested bounds cannot be filled', () => {
		const child = new Image();
		child.width = 50;
		child.height = 50;
		child.rotation = 45;
		child.setLayoutBoundsSize(640, 62);
		child.setLayoutBoundsPosition(0, 0);

		const bounds = new Rectangle();
		child.getLayoutBounds(bounds);
		expect(child.width).toBeCloseTo(62 / Math.SQRT2);
		expect(child.height).toBeCloseTo(62 / Math.SQRT2);
		expect(bounds.width).toBeCloseTo(62);
		expect(bounds.height).toBeCloseTo(62);
	});

	it('retains the natural local width when horizontal scale collapses to zero', () => {
		const child = new Image();
		child.width = 50;
		child.height = 50;
		child.scaleX = 0;
		child.scaleY = -1;
		child.setLayoutBoundsSize(640, 62);
		const bounds = new Rectangle();
		child.getLayoutBounds(bounds);
		expect([child.width, child.height]).toEqual([50, 62]);
		expect([bounds.width, bounds.height]).toEqual([0, 62]);
	});

	it('keeps finite natural dimensions when both scale axes collapse to zero', () => {
		const child = new Image();
		child.width = 50;
		child.height = 30;
		child.scaleX = 0;
		child.scaleY = 0;
		child.setLayoutBoundsSize(640, 62);
		const bounds = new Rectangle();
		child.getLayoutBounds(bounds);
		expect([child.width, child.height]).toEqual([50, 30]);
		expect([bounds.width, bounds.height]).toEqual([0, 0]);
	});

	it('honors local limits and keeps an attainable transformed allocation contained', () => {
		const child = new Image();
		child.width = 50;
		child.height = 50;
		child.minWidth = 30;
		child.minHeight = 20;
		child.maxWidth = 120;
		child.maxHeight = 90;
		child.rotation = 30;
		child.setLayoutBoundsSize(640, 140);
		const bounds = new Rectangle();
		child.getLayoutBounds(bounds);
		expect(child.width).toBeGreaterThanOrEqual(30);
		expect(child.width).toBeLessThanOrEqual(120);
		expect(child.height).toBeGreaterThanOrEqual(20);
		expect(child.height).toBeLessThanOrEqual(90);
		expect(bounds.width).toBeLessThanOrEqual(640 + 1e-8);
		expect(bounds.height).toBeLessThanOrEqual(140 + 1e-8);
	});

	it('preserves local dimensions when neither parent axis is allocated', () => {
		const child = new Image();
		child.width = 50;
		child.height = 30;
		child.scaleX = -2;
		child.scaleY = -0.5;
		child.rotation = 17;
		child.skewX = 9;
		child.setLayoutBoundsSize(NaN, NaN);
		expect([child.width, child.height]).toEqual([50, 30]);
	});
});
