import { BackdropBlur, Rectangle, Shape, Sprite } from '../../src/index.js';
import type { BackdropChecks } from './BackdropAdvancedChecks.js';

export function backdropReleaseChecks(t: BackdropChecks): void {
	const { app, render, pixel, check, context, canvas } = t;
	app.stage.removeChildren();
	const group = new Sprite();
	const background = t.stripes();
	const effect = new BackdropBlur({ width: 160, height: 120, blurX: 10, blurY: 10 });
	group.addChild(background);
	group.addChild(effect);
	const mask = new Shape();
	mask.graphics.beginFill(0xffffff);
	mask.graphics.drawRect(0, 0, 160, 120);
	mask.graphics.endFill();
	app.stage.addChild(group);
	app.stage.addChild(mask);
	group.mask = mask;
	render();
	const blurred = pixel(62, 40)[0];
	group.alpha = 0.5;
	effect.alpha = 0.7;
	render();
	const result = pixel(62, 40);
	const straight = context ? result[0] * 255 / result[3] : result[0];
	const expected = 255 * 0.65 + blurred * 0.35;
	check(Math.abs(straight - expected) < 5 && Math.abs(result[3] - 128) <= 2,
		`masked world-alpha interpolation: ${result}, straight ${straight}, expected ${expected}`);
	app.stage.removeChildren();
	if (context) {
		return;
	}
	const outer = new Sprite();
	const inner = new Sprite();
	outer.rotation = 10;
	outer.x = 30;
	outer.y = 10;
	outer.alpha = 0.5;
	inner.rotation = 5;
	inner.scrollRect = new Rectangle(4, 5, 100, 80);
	effect.width = 80;
	effect.height = 60;
	effect.rotation = 3;
	app.stage.addChild(t.stripes());
	app.stage.addChild(outer);
	outer.addChild(inner);
	inner.addChild(effect);
	render();
	const point = effect.localToGlobal(40, 30);
	const before = pixel(point.x, point.y);
	const draw = CanvasRenderingContext2D.prototype.drawImage;
	CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: Parameters<typeof draw>): void {
		if (args[0] === canvas) {
			throw new Error('nested Canvas sampling failure');
		}
		Reflect.apply(draw, this, args);
	} as typeof draw;
	let thrown = false;
	try {
		render();
	} catch (error) {
		thrown = error instanceof Error && error.message.includes('nested Canvas');
	} finally {
		CanvasRenderingContext2D.prototype.drawImage = draw;
	}
	check(thrown, 'nested transformed Canvas sampling failure propagates');
	render();
	const after = pixel(point.x, point.y);
	check(before.every((value, index) => Math.abs(value - after[index]) <= 2),
		`nested Canvas recovery preserves pixels: ${before} -> ${after}`);
	check(canvas.getContext('2d')!.globalAlpha === 1 && canvas.getContext('2d')!.getTransform().isIdentity,
		'nested failure restores root alpha and transform');
	app.stage.removeChildren();
}
