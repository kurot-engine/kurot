// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { Matrix } from '@blakron/core';
import { BasicLayout, Group, Image } from '../src/index.js';

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
