import { describe, expect, it } from 'vitest';
import { Rectangle, Shape } from '@kurot/core';
import { Group } from '../src/kurot/components/Group.js';
import { Component } from '../src/kurot/components/Component.js';
import { Image } from '../src/kurot/components/Image.js';
import { Label } from '../src/kurot/components/Label.js';
import { RichLabel } from '../src/kurot/components/RichLabel.js';
import { BitmapLabel } from '../src/kurot/components/BitmapLabel.js';
import { Button } from '../src/kurot/components/Button.js';
import { Rect } from '../src/kurot/components/Rect.js';
import { BasicLayout } from '../src/kurot/layouts/BasicLayout.js';

const componentTypes = [Group, Component, Image, Label, RichLabel, BitmapLabel, Button, Rect];

describe('centered UI flips', () => {
	it.each(componentTypes.map(Type => ({ name: Type.name, Type })))(
		'$name preserves its allocated frame',
		({ Type }) => {
			const parent = new Group();
			parent.width = 640;
			parent.height = 62;
			parent.layout = new BasicLayout();
			const child = new Type();
			child.left = 0;
			child.top = 0;
			child.percentWidth = 100;
			child.percentHeight = 100;
			child.anchorOffsetX = 17;
			child.anchorOffsetY = 11;
			child.flipX = true;
			child.flipY = true;
			parent.addChild(child);
			parent.validateSize(true);
			parent.validateDisplayList();
			const frame = new Rectangle();
			child.getLayoutBounds(frame);
			expect([frame.x, frame.y, frame.width, frame.height]).toEqual([0, 0, 640, 62]);
			expect(child.localToGlobal(0, 0)).toEqual({ x: 640, y: 62 });
			expect(child.localToGlobal(640, 62)).toEqual({ x: 0, y: 0 });
			expect([child.x, child.y, child.scaleX, child.scaleY]).toEqual([17, 11, 1, 1]);
			parent.width = 360;
			parent.validateSize(true);
			parent.validateDisplayList();
			expect(child.localToGlobal(0, 0)).toEqual({ x: 360, y: 62 });
		},
	);

	it('uses a Group layout frame instead of its sparse child content', () => {
		const group = new Group();
		group.width = 100;
		group.height = 50;
		const shape = new Shape();
		shape.graphics.beginFill(0xffffff);
		shape.graphics.drawRect(0, 0, 10, 10);
		group.addChild(shape);
		group.setLayoutBoundsSize(100, 50);
		group.flipX = true;
		expect(shape.localToGlobal(0, 0)).toEqual({ x: 100, y: 0 });
		expect(group.width).toBe(100);
	});

	it('preserves layout bounds under rotation, skew and negative scaling', () => {
		const child = new Component();
		child.width = 120;
		child.height = 60;
		child.scaleX = -2;
		child.scaleY = 0.5;
		child.rotation = 30;
		child.skewX = 12;
		child.anchorOffsetX = 40;
		child.setLayoutBoundsSize(NaN, NaN);
		child.setLayoutBoundsPosition(20, 10);
		const before = new Rectangle();
		child.getLayoutBounds(before);
		const center = child.localToGlobal(60, 30);
		child.flipX = true;
		child.flipY = true;
		const after = new Rectangle();
		child.getLayoutBounds(after);
		expect(after).toEqual(before);
		expect(child.localToGlobal(60, 30).x).toBeCloseTo(center.x);
		expect(child.localToGlobal(60, 30).y).toBeCloseTo(center.y);
	});
});
