import { BackdropBlur, createPlayer, Shape, Sprite, Rectangle, BlurFilter } from '../../src/index.js';
import type { WebGLRenderContext, WebGLRenderBuffer, CanvasRenderer, CanvasBuffer } from '../../src/index.js';
import { advancedBackdropChecks } from './BackdropAdvancedChecks.js';
import { optimizationBackdropChecks } from './BackdropOptimizationChecks.js';
import { backdropReleaseChecks } from './BackdropReleaseChecks.js';

export interface BackdropReport {
	backend: string;
	checks: number;
	failures: string[];
	allocations: number;
}

declare global {
	interface Window {
		runBackdropChecks(): Promise<BackdropReport>;
	}
}

export async function runBackdropChecks(): Promise<BackdropReport> {
	const params = new URLSearchParams(location.search);
	const canvas = document.querySelector('canvas')!;
	const resolution = Number(params.get('resolution') ?? 1);
	if (params.get('backend') === 'canvas') {
		canvas.getContext('2d');
	} else if (params.get('antialias') === 'false') {
		canvas.getContext(params.get('backend') === 'webgl1' ? 'webgl' : 'webgl2', { antialias: false, stencil: true, depth: false });
	}
	const app = createPlayer({ canvas, contentWidth: 160, contentHeight: 120, resolution, scaleMode: 'showAll' });
	const context = Reflect.get(app.player, '_webglContext') as WebGLRenderContext | undefined;
	const report: BackdropReport = {
		backend: context ? context.isWebGL2 ? 'webgl2' : 'webgl1' : 'canvas', checks: 0, failures: [], allocations: 0,
	};
	const workingCanvases: HTMLCanvasElement[] = [];
	const check = (ok: boolean, label: string): void => {
		report.checks++;
		if (!ok) {
			report.failures.push(label);
		}
	};
	const render = (): void => app.player.render(false, 0);
	const pixel = (x: number, y: number): number[] => {
		const px = Math.floor(x * canvas.width / app.stage.stageWidth);
		const py = Math.floor(y * canvas.height / app.stage.stageHeight);
		if (context) {
			context.flush();
			(Reflect.get(app.player, '_webglBuffer') as WebGLRenderBuffer).rootRenderTarget.activate();
			const bytes = new Uint8Array(4);
			context.gl.readPixels(px, canvas.height - 1 - py, 1, 1, context.gl.RGBA, context.gl.UNSIGNED_BYTE, bytes);
			return Array.from(bytes);
		}
		return Array.from(canvas.getContext('2d')!.getImageData(px, py, 1, 1).data);
	};
	const equal = (a: number[], b: number[], tolerance = 2): boolean => a.every((v, i) => Math.abs(v - b[i]) <= tolerance);
	const backdrop = new BackdropBlur({ width: 88, height: 76, blurX: 10, blurY: 10, quality: 2 });
	backdrop.x = 36;
	backdrop.y = 22;
	const background = stripes();
	const foreground = rect(0xff00aa, 7, 24);
	foreground.x = 78;
	foreground.y = 46;
	app.stage.addChild(background);
	app.stage.addChild(backdrop);
	app.stage.addChild(foreground);
	try {
		backdrop.visible = false;
		render();
		const original = pixel(62, 40);
		const outside = pixel(10, 40);
		const sharp = pixel(80, 52);
		backdrop.visible = true;
		render();
		const blurred = pixel(62, 40);
		check(blurred[0] > 25 && blurred[0] < 230 && !equal(original, blurred, 8), `blurred pixels: ${original} -> ${blurred}`);
		check(equal(outside, pixel(10, 40), 0), `outside is unchanged: ${outside} -> ${pixel(10, 40)}`);
		check(equal(sharp, pixel(80, 52), 0), `foreground is sharp: ${sharp} -> ${pixel(80, 52)}`);
		background.x = 58;
		render();
		check(!equal(blurred, pixel(62, 40), 0), 'background changes update without backdrop invalidation');
		background.x = 0;
		backdrop.alpha = 0;
		render();
		check(equal(original, pixel(62, 40), 0), `zero alpha is identity: ${original} -> ${pixel(62, 40)}`);
		backdrop.alpha = 1;
		render();
		const full = pixel(62, 40);
		backdrop.alpha = 0.5;
		render();
		check(Math.abs(pixel(62, 40)[0] - (original[0] + full[0]) / 2) <= 3, 'half opacity interpolates original and blurred color');
		backdrop.alpha = 1;
		backdrop.blurX = backdrop.blurY = 0;
		render();
		check(equal(original, pixel(62, 40), 0), 'zero radius is identity');
		backdrop.blurX = backdrop.blurY = 10;
		app.stage.removeChild(backdrop);
		render();
		check(equal(original, pixel(62, 40), 0), 'removal restores original pixels');
		app.stage.addChildAt(backdrop, 1);
		background.alpha = 0.4;
		render();
		check(Math.abs(pixel(62, 40)[3] - 102) <= 3, `transparent alpha is not doubled: ${pixel(62, 40)}`);
		backdrop.alpha = 0.5;
		render();
		check(Math.abs(pixel(62, 40)[3] - 102) <= 3, 'partial effect keeps transparent alpha');
		background.alpha = backdrop.alpha = 1;
		const second = new BackdropBlur({ width: 40, height: 40, blurX: 12, blurY: 12 });
		second.x = 70;
		second.y = 42;
		app.stage.addChild(second);
		render();
		check(pixel(80, 52)[1] > 5 || pixel(80, 52)[0] < 245, 'upper backdrop samples lower foreground');
		app.stage.removeChild(second);
		const group = new Sprite();
		app.stage.addChild(group);
		group.addChild(backdrop);
		group.x = 20;
		group.y = 8;
		backdrop.x = 0;
		backdrop.y = 0;
		group.rotation = 23;
		group.scaleX = 1.2;
		group.scaleY = 0.8;
		group.mask = new Rectangle(0, 0, 45, 40);
		render();
		check(pixel(28, 25)[0] > 20 && pixel(28, 25)[0] < 235, 'transformed clipped interior blurs');
		check(equal(outside, pixel(10, 40), 0), 'transformed bounding-box exterior unchanged');
		group.rotation = 0;
		group.scaleX = group.scaleY = 1;
		group.mask = undefined;
		group.x = group.y = 0;
		backdrop.x = 36;
		backdrop.y = 22;
		group.alpha = 0.5;
		render();
		check(Math.abs(pixel(62, 40)[0] - (original[0] + full[0]) / 2) <= 3, 'ancestor alpha interpolates the backdrop effect');
		group.alpha = 1;
		group.filters = [new BlurFilter(0, 0)];
		render();
		check(equal(original, pixel(62, 40), 0), 'filtered parent does not sample outside its isolation');
		group.filters = [];
		group.cacheAsBitmap = true;
		let rejected = false;
		try {
			render();
		} catch (error) {
			rejected = error instanceof Error && error.message.includes('cacheAs');
		}
		check(rejected, 'cached ancestors are rejected explicitly');
		group.cacheAsBitmap = false;
		render();
		check(pixel(62, 40)[0] > 20 && pixel(62, 40)[0] < 235, 'rendering recovers after rejected cache');
		for (let i = 0; i < 3; i++) {
			render();
		}
		if (context) {
			const gl = context.gl;
			const create = gl.createTexture;
			gl.createTexture = function (): ReturnType<typeof create> {
				report.allocations++;
				return create.call(gl);
			};
			try {
				for (let i = 0; i < 20; i++) {
					group.removeChild(backdrop);
					render();
					group.addChild(backdrop);
					render();
				}
			} finally {
				gl.createTexture = create;
			}
			check(report.allocations === 0, `stable GPU texture reuse: ${report.allocations}`);
			check(gl.getError() === gl.NO_ERROR, 'no WebGL errors');
		} else {
			const create = document.createElement;
			let canvases = 0;
			document.createElement = function (name: string, options?: ElementCreationOptions): HTMLElement {
				if (name.toLowerCase() === 'canvas') {
					canvases++;
				}
				return create.call(document, name, options);
			} as typeof create;
			try {
				for (let i = 0; i < 20; i++) {
					group.removeChild(backdrop);
					render();
					group.addChild(backdrop);
					render();
				}
			} finally {
				document.createElement = create;
			}
			check(canvases === 0, `stable Canvas reuse: ${canvases}`);
		}
		check(!backdrop.touchEnabled && app.stage.$hitTest(60, 40) !== backdrop, 'does not intercept input');
		app.player.updateStageSize(160, 120, 240, 180);
		render();
		check(pixel(62, 40)[0] > 20 && pixel(62, 40)[0] < 235,
			`fractional stage adaptation: ${pixel(62, 40)} @${canvas.width}x${canvas.height}`);
		for (const density of [2.5, 1.25, 2]) {
			app.player.updateStageSize(160, 120, 160 * density, 120 * density);
			render();
			check(pixel(62, 40)[0] > 20 && pixel(62, 40)[0] < 235, `resize first frame at ${density}x`);
		}
		await advancedBackdropChecks({ app, canvas, context, render, pixel, check, stripes });
		optimizationBackdropChecks({ app, canvas, context, render, pixel, check, stripes });
		backdropReleaseChecks({ app, canvas, context, render, pixel, check, stripes });
		if (!context) {
			const renderer = Reflect.get(app.player, '_canvas2dRenderer') as CanvasRenderer;
			const system = Reflect.get(renderer, '_backdrop') as object;
			for (const name of ['_sample', '_blurred', '_mixed']) {
				workingCanvases.push((Reflect.get(system, name) as CanvasBuffer).surface);
			}
		}
	} finally {
		app.destroy();
	}
	check(app.player.framebufferPoolBytes === 0, 'destroy releases pooled GPU targets');
	check(workingCanvases.every(surface => surface.width === 0 && surface.height === 0),
		'destroy releases Canvas working storage');
	return report;
}

export function rect(color: number, width: number, height: number): Shape {
	const shape = new Shape();
	shape.graphics.beginFill(color);
	shape.graphics.drawRect(0, 0, width, height);
	shape.graphics.endFill();
	return shape;
}

export function stripes(): Sprite {
	const result = new Sprite();
	for (let x = 0; x < 160; x += 4) {
		result.graphics.beginFill(x % 8 ? 0xffffff : 0);
		result.graphics.drawRect(x, 0, 4, 120);
		result.graphics.endFill();
	}
	return result;
}

window.runBackdropChecks = runBackdropChecks;
