import { describe, it, expect } from 'vitest';
import { Graphics } from '../src/blakron/display/Graphics.js';
import { PathCommandType } from '../src/blakron/display/GraphicsPath.js';
import { Rectangle } from '../src/blakron/geom/Rectangle.js';
import { Matrix } from '../src/blakron/geom/Matrix.js';

describe('Graphics', () => {
	it('starts with empty commands', () => {
		const g = new Graphics();
		expect(g.commands.length).toBe(0);
	});

	it('drawRect adds command and updates bounds', () => {
		const g = new Graphics();
		g.drawRect(10, 20, 100, 50);
		expect(g.commands.length).toBe(1);
		expect(g.commands[0].type).toBe(PathCommandType.DrawRect);
		const bounds = new Rectangle();
		g.$measureContentBounds(bounds);
		expect(bounds.x).toBe(10);
		expect(bounds.y).toBe(20);
		expect(bounds.width).toBe(100);
		expect(bounds.height).toBe(50);
	});

	it('drawCircle updates bounds', () => {
		const g = new Graphics();
		g.drawCircle(50, 50, 30);
		const bounds = new Rectangle();
		g.$measureContentBounds(bounds);
		expect(bounds.x).toBeLessThanOrEqual(50 - 30);
		expect(bounds.y).toBeLessThanOrEqual(50 - 30);
		expect(bounds.width).toBeGreaterThanOrEqual(60);
		expect(bounds.height).toBeGreaterThanOrEqual(60);
	});

	it('drawEllipse updates bounds', () => {
		const g = new Graphics();
		g.drawEllipse(0, 0, 100, 50);
		const bounds = new Rectangle();
		g.$measureContentBounds(bounds);
		expect(bounds.width).toBeGreaterThanOrEqual(100);
		expect(bounds.height).toBeGreaterThanOrEqual(50);
	});

	it('moveTo + lineTo updates bounds', () => {
		const g = new Graphics();
		g.moveTo(0, 0);
		g.lineTo(100, 200);
		const bounds = new Rectangle();
		g.$measureContentBounds(bounds);
		expect(bounds.x).toBe(0);
		expect(bounds.y).toBe(0);
		expect(bounds.width).toBe(100);
		expect(bounds.height).toBe(200);
	});

	it('beginFill + endFill adds commands', () => {
		const g = new Graphics();
		g.beginFill(0xff0000, 1);
		g.drawRect(0, 0, 50, 50);
		g.endFill();
		expect(g.commands.length).toBe(3);
		expect(g.commands[0].type).toBe(PathCommandType.BeginFill);
		expect(g.commands[2].type).toBe(PathCommandType.EndFill);
	});

	it('lineStyle adds command', () => {
		const g = new Graphics();
		g.lineStyle(2, 0x000000, 1);
		expect(g.commands.length).toBe(1);
		expect(g.commands[0].type).toBe(PathCommandType.LineStyle);
	});

	it('lineStyle with thickness affects bounds', () => {
		const g = new Graphics();
		g.lineStyle(10);
		g.moveTo(50, 50);
		g.lineTo(100, 50);
		const bounds = new Rectangle();
		g.$measureContentBounds(bounds);
		expect(bounds.y).toBeLessThan(50);
		expect(bounds.height).toBeGreaterThan(0);
	});

	it('clear resets commands and bounds', () => {
		const g = new Graphics();
		g.drawRect(10, 20, 100, 50);
		g.clear();
		expect(g.commands.length).toBe(0);
		const bounds = new Rectangle();
		g.$measureContentBounds(bounds);
		expect(bounds.isEmpty()).toBe(true);
	});

	it('canvasCacheDirty is set on each draw command', () => {
		const g = new Graphics();
		g.canvasCacheDirty = false;
		g.drawRect(0, 0, 10, 10);
		expect(g.canvasCacheDirty).toBe(true);
	});

	it('clear sets canvasCacheDirty', () => {
		const g = new Graphics();
		g.drawRect(0, 0, 10, 10);
		g.canvasCacheDirty = false;
		g.clear();
		expect(g.canvasCacheDirty).toBe(true);
	});

	it('curveTo adds command and expands bounds', () => {
		const g = new Graphics();
		g.moveTo(0, 0);
		g.curveTo(50, 100, 100, 0);
		const bounds = new Rectangle();
		g.$measureContentBounds(bounds);
		expect(bounds.height).toBeGreaterThan(0);
		expect(bounds.width).toBe(100);
	});

	it('cubicCurveTo adds command', () => {
		const g = new Graphics();
		g.moveTo(0, 0);
		g.cubicCurveTo(10, 50, 90, 50, 100, 0);
		expect(g.commands.length).toBe(2);
		expect(g.commands[1].type).toBe(PathCommandType.CubicCurveTo);
	});

	it('drawRoundRect adds command', () => {
		const g = new Graphics();
		g.drawRoundRect(0, 0, 100, 50, 10);
		expect(g.commands[0].type).toBe(PathCommandType.DrawRoundRect);
	});

	it('drawArc adds command', () => {
		const g = new Graphics();
		g.drawArc(50, 50, 30, 0, Math.PI);
		expect(g.commands[0].type).toBe(PathCommandType.DrawArc);
	});

	it('drawArc with negative radius is no-op', () => {
		const g = new Graphics();
		g.drawArc(50, 50, -1, 0, Math.PI);
		expect(g.commands.length).toBe(0);
	});

	it('drawArc with equal start/end angle is no-op', () => {
		const g = new Graphics();
		g.drawArc(50, 50, 30, Math.PI / 2, Math.PI / 2);
		expect(g.commands.length).toBe(0);
	});

	it('drawArc anticlockwise', () => {
		const g = new Graphics();
		g.drawArc(50, 50, 30, 0, Math.PI, true);
		expect(g.commands.length).toBe(1);
		expect(g.commands[0].type).toBe(PathCommandType.DrawArc);
	});

	it('lineStyle with cap/joint params', () => {
		const g = new Graphics();
		g.lineStyle(3, 0xff0000, 1, false, 'normal', 'round', 'miter', 5);
		expect(g.commands.length).toBe(1);
		const cmd = g.commands[0] as { caps?: string; joints?: string; miterLimit?: number };
		expect(cmd.caps).toBe('round');
		expect(cmd.joints).toBe('miter');
		expect(cmd.miterLimit).toBe(5);
	});

	it('lineStyle with lineDash', () => {
		const g = new Graphics();
		g.lineStyle(3, 0, 1, false, 'normal', undefined, undefined, 3, [5, 10]);
		expect(g.commands.length).toBe(1);
	});

	it('lineStyle with thickness <= 0 is no-op', () => {
		const g = new Graphics();
		g.lineStyle(0);
		expect(g.commands.length).toBe(0);
	});

	it('beginGradientFill adds command', () => {
		const g = new Graphics();
		g.beginGradientFill('linear', [0xff0000, 0x0000ff], [1, 1], [0, 255], new Matrix());
		expect(g.commands.length).toBe(1);
		expect(g.commands[0].type).toBe(PathCommandType.BeginGradientFill);
	});

	it('empty graphics $measureContentBounds returns empty rect', () => {
		const g = new Graphics();
		const bounds = new Rectangle();
		g.$measureContentBounds(bounds);
		expect(bounds.isEmpty()).toBe(true);
	});

	it('drawRoundRect with single ellipse param', () => {
		const g = new Graphics();
		g.drawRoundRect(0, 0, 100, 50, 10);
		// When ellipseHeight not provided, it uses ellipseWidth
		const cmd = g.commands[0] as { ew: number; eh: number };
		expect(cmd.eh).toBe(10); // same as ew
	});

	it('drawRoundRect with separate ellipse dimensions', () => {
		const g = new Graphics();
		g.drawRoundRect(0, 0, 100, 50, 10, 8);
		const cmd = g.commands[0] as { ew: number; eh: number };
		expect(cmd.ew).toBe(10);
		expect(cmd.eh).toBe(8);
	});
});
