import { BackdropBlur, BlurFilter, Sprite } from '../../src/index.js';
import type { BackdropChecks } from './BackdropAdvancedChecks.js';

/**
 * Pixel assertions accompany GPU-work assertions so shrinking a snapshot or
 * draw rectangle cannot pass by silently skipping the visual effect.
 */
export function optimizationBackdropChecks(t: BackdropChecks): void {
	const { context, app, render, pixel, check } = t;
	if (!context) {
		return;
	}
	app.stage.removeChildren();
	const background = t.stripes();
	const effect = new BackdropBlur({ width: 100, height: 70, blurX: 12, blurY: 12, resolution: 0.5 });
	effect.x = effect.y = 20;
	app.stage.addChild(background);
	app.stage.addChild(effect);
	const gl = context.gl;
	const copy = gl.copyTexSubImage2D;
	const draw = context.$drawFilterPass;
	const composite = context.$drawBackdropComposite;
	const gl2 = context.isWebGL2 ? gl as WebGL2RenderingContext : undefined;
	const blit = gl2?.blitFramebuffer;
	let copies = 0;
	const blits: Array<{ source: number; destination: number }> = [];
	const snapshots: Array<{ pixels: number; resolution: number }> = [];
	const quads: number[][] = [];
	gl.copyTexSubImage2D = function (...args: Parameters<typeof copy>): void {
		copies++;
		Reflect.apply(copy, gl, args);
	};
	if (gl2 && blit) {
		gl2.blitFramebuffer = function (...args: Parameters<typeof blit>): void {
			blits.push({ source: Math.abs((args[2] - args[0]) * (args[3] - args[1])),
				destination: Math.abs((args[6] - args[4]) * (args[7] - args[5])) });
			Reflect.apply(blit, gl2, args);
		};
	}
	context.$drawFilterPass = function (...args: Parameters<typeof draw>): void {
		if (args[0]?.uniforms.uCapture) {
			snapshots.push({ pixels: args[2].width * args[2].height, resolution: args[3] });
		}
		draw.apply(context, args);
	};
	context.$drawBackdropComposite = function (...args: Parameters<typeof composite>): void {
		quads.push([...args[3]]);
		composite.apply(context, args);
	};
	try {
		render();
		check(pixel(62, 40)[0] > 20 && pixel(62, 40)[0] < 235, 'downsampled capture still blurs actual pixels');
		check(snapshots[0].resolution === 0.5 && snapshots[0].pixels < app.stage.stageWidth * app.stage.stageHeight,
			'snapshot is captured at effect density');
		const quad = quads[0];
		const xs = quad.filter((_, i) => i % 2 === 0);
		const ys = quad.filter((_, i) => i % 2 === 1);
		check(Math.max(...xs) - Math.min(...xs) === 200 && Math.max(...ys) - Math.min(...ys) === 140,
			'composite vertices restrict rasterization to the physical effect quad');
		if (gl2 && gl.getContextAttributes()?.antialias === false) {
			check(copies === 0 && blits.some(value => value.destination < value.source / 8),
				'single-sample WebGL 2 downsamples during capture without native-size copy');
		}
		const group = new Sprite();
		group.filters = [new BlurFilter(0, 0)];
		group.addChild(background);
		group.addChild(effect);
		app.stage.addChild(group);
		copies = 0;
		blits.length = snapshots.length = 0;
		render();
		check(copies === 0 && blits.length === 0, 'offscreen backdrop directly samples existing parent texture');
		check(pixel(62, 40)[0] > 20 && pixel(62, 40)[0] < 235, 'borrowed parent texture retains visible blur');
		effect.width = 160;
		effect.height = 120;
		effect.x = effect.y = 0;
		effect.resolution = undefined;
		effect.blurX = effect.blurY = 96;
		snapshots.length = 0;
		render();
		check(snapshots[0].resolution <= 32 / 96, 'large-radius working density is applied before snapshot');
		const large = pixel(62, 40);
		check(large[0] > 20 && large[0] < 235 && large[3] === 255,
			'large-radius downsampling preserves blur and opaque coverage');
		effect.alpha = 0.5;
		render();
		check(pixel(62, 40)[3] === 255, 'constant-alpha blend preserves destination alpha');
		check(gl.getError() === gl.NO_ERROR, 'optimized capture and blending leave no GL errors');
	} finally {
		gl.copyTexSubImage2D = copy;
		if (gl2 && blit) {
			gl2.blitFramebuffer = blit;
		}
		context.$drawFilterPass = draw;
		context.$drawBackdropComposite = composite;
		app.stage.removeChildren();
	}
}
