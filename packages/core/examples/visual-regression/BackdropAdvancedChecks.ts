import { BackdropBlur, BlurFilter, Matrix, Rectangle, Shape, Sprite } from '../../src/index.js';
import type { KurotApp, WebGLRenderContext } from '../../src/index.js';

export interface BackdropChecks {
	app: KurotApp;
	context?: WebGLRenderContext;
	canvas: HTMLCanvasElement;
	render(): void;
	pixel(x: number, y: number): number[];
	check(condition: boolean, label: string): void;
	stripes(): Sprite;
}

export async function advancedBackdropChecks(t: BackdropChecks): Promise<void> {
	const { app, canvas, context, render, pixel, check } = t;
	app.stage.removeChildren();
	const background = t.stripes();
	app.stage.addChild(background);
	const node = new BackdropBlur({ width: 58, height: 48, blurX: 12, blurY: 6, resolution: 0.75 });
	node.x = 92;
	node.y = 40;
	node.anchorOffsetX = 8;
	node.anchorOffsetY = 4;
	node.matrix = new Matrix(-1.1, 0.45, 0.2, 0.85, 92, 40);
	app.stage.addChild(node);
	node.visible = false;
	render();
	const points: Array<{ x: number; y: number; before: number[] }> = [];
	for (let y = 5; y < 115; y += 10) {
		for (let x = 5; x < 155; x += 10) {
			const local = node.globalToLocal(x, y);
			if (local.x < -3 || local.y < -3 || local.x > node.width + 3 || local.y > node.height + 3) {
				points.push({ x, y, before: pixel(x, y) });
			}
		}
	}
	node.visible = true;
	render();
	for (const point of points) {
		check(point.before.every((v, i) => v === pixel(point.x, point.y)[i]), 'affine output leaves exterior unchanged');
	}
	const center = node.localToGlobal(25, 24);
	check(pixel(center.x, center.y)[0] > 20 && pixel(center.x, center.y)[0] < 235, 'skew, reflection, anchor and reduced resolution');
	app.stage.removeChild(node);
	const group = new Sprite();
	group.isRenderGroup = true;
	const effect = new BackdropBlur({ width: 80, height: 80, blurX: 14, blurY: 14 });
	effect.x = effect.y = 20;
	group.addChild(effect);
	app.stage.addChild(group);
	group.scrollRect = new Rectangle(8, 4, 50, 50);
	render();
	check(pixel(30, 30)[0] > 20 && pixel(30, 30)[0] < 235, 'scroll viewport within render group');
	check(pixel(70, 30)[0] === 255, 'scroll clip excludes effect');
	group.scrollRect = undefined;
	group.addChildAt(t.stripes(), 0);
	const mask = new Shape();
	mask.graphics.beginFill(0xffffff);
	mask.graphics.drawCircle(60, 60, 32);
	mask.graphics.endFill();
	app.stage.addChild(mask);
	group.mask = mask;
	render();
	check(pixel(60, 60)[0] > 20 && pixel(60, 60)[0] < 235, 'shape-mask isolation blurs preceding local siblings');
	check(pixel(26, 30)[0] === 0, 'shape-mask exterior unchanged');
	group.mask = undefined;
	app.stage.removeChild(mask);
	group.filters = [new BlurFilter(2, 2)];
	render();
	check(pixel(60, 60)[0] > 20 && pixel(60, 60)[0] < 235, 'parent filter retains local backdrop contents');
	group.filters = [];
	group.removeChildren();
	group.addChild(effect);
	effect.mask = new Rectangle(0, 0, 25, 25);
	render();
	check(pixel(30, 30)[0] > 20 && pixel(30, 30)[0] < 235, 'own rectangle mask');
	check(pixel(62, 30)[0] === 255, 'own rectangle mask keeps exterior');
	effect.mask = new Rectangle(16, 12, 25, 25);
	render();
	check(pixel(46, 40)[0] > 20 && pixel(46, 40)[0] < 235, 'nonzero rectangle-mask origin');
	check(pixel(30, 30)[0] === 255, 'rectangle-mask origin does not shift to zero');
	effect.mask = undefined;
	background.graphics.clear();
	background.graphics.beginFill(0x3278c8);
	background.graphics.drawRect(0, 0, 160, 120);
	background.graphics.endFill();
	effect.x = effect.y = 0;
	effect.width = 160;
	effect.height = 120;
	render();
	for (const [x, y] of [[0, 0], [159, 0], [0, 119], [159, 119], [80, 60]]) {
		const p = pixel(x, y);
		check(p[3] === 255 && Math.abs(p[2] - 200) < 3, `edge extension without dark/transparent fringe ${x},${y}: ${p}`);
	}
	if (context) {
		const gl = context.gl;
		const read = gl.readPixels;
		let reads = 0;
		gl.readPixels = function (...args: Parameters<typeof read>): void {
			reads++;
			Reflect.apply(read, gl, args);
		} as typeof read;
		try {
			render();
		} finally {
			gl.readPixels = read;
		}
		check(reads === 0, 'GPU effect never reads pixels to CPU');
		const operation = context.isWebGL2 && gl.getContextAttributes()?.antialias === false
			? 'blitFramebuffer' : 'copyTexSubImage2D';
		const copy: unknown = Reflect.get(gl, operation);
		Reflect.set(gl, operation, (): void => {
			throw new Error('injected backdrop copy failure');
		});
		let thrown = false;
		try {
			render();
		} catch (error) {
			thrown = error instanceof Error && error.message.includes('injected');
		} finally {
			Reflect.set(gl, operation, copy);
		}
		check(thrown, 'GPU sampling exception propagates');
		render();
		check(pixel(80, 60)[3] === 255, 'sampling failure restores buffers and render state');
		const lose = gl.getExtension('WEBGL_lose_context');
		check(lose !== null, 'context loss extension available for real recovery test');
		if (lose) {
			const lost = new Promise<void>(resolve => canvas.addEventListener('webglcontextlost', () => resolve(), { once: true }));
			lose.loseContext();
			await lost;
			// Restore only after the loss event has finished dispatching.
			await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
			const restored = new Promise<void>(resolve => canvas.addEventListener('webglcontextrestored', () => resolve(), { once: true }));
			lose.restoreContext();
			await restored;
			render();
			check(pixel(80, 60)[3] === 255 && Math.abs(pixel(80, 60)[2] - 200) < 3, 'context restoration recreates backdrop targets');
			check(gl.getError() === gl.NO_ERROR, 'restored context has no GL errors');
		}
	} else {
		const draw = CanvasRenderingContext2D.prototype.drawImage;
		CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: Parameters<typeof draw>): void {
			if (args[0] === canvas) {
				throw new Error('injected Canvas backdrop copy failure');
			}
			Reflect.apply(draw, this, args);
		} as typeof draw;
		let thrown = false;
		try {
			render();
		} catch (error) {
			thrown = error instanceof Error && error.message.includes('injected');
		} finally {
			CanvasRenderingContext2D.prototype.drawImage = draw;
		}
		check(thrown, 'Canvas sampling exception propagates');
		render();
		check(pixel(80, 60)[3] === 255, 'Canvas sampling failure restores render state');
		const prototype = CanvasRenderingContext2D.prototype;
		const descriptor = Object.getOwnPropertyDescriptor(prototype, 'filter');
		if (descriptor?.configurable) {
			background.graphics.clear();
			group.removeChild(effect);
			app.stage.removeChild(background);
			app.stage.addChildAt(t.stripes(), 0);
			group.addChild(effect);
			effect.visible = false;
			render();
			const original = pixel(62, 40);
			Reflect.deleteProperty(prototype, 'filter');
			// Unsupported browsers can still have a filter expando from other code.
			canvas.getContext('2d')!.filter = 'blur(8px)';
			let samples = 0;
			const draw = prototype.drawImage;
			prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: Parameters<typeof draw>): void {
				if (args[0] === canvas) {
					samples++;
				}
				Reflect.apply(draw, this, args);
			} as typeof draw;
			try {
				effect.visible = true;
				render();
				check(original.every((v, i) => v === pixel(62, 40)[i]), 'Canvas without filter preserves unmodified background');
				check(samples === 0, 'unsupported filter expando does not trigger backdrop sampling');
			} finally {
				prototype.drawImage = draw;
				Reflect.deleteProperty(canvas.getContext('2d')!, 'filter');
				Object.defineProperty(prototype, 'filter', descriptor);
			}
		}
	}
	app.stage.removeChildren();
}
