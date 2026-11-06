import * as kurot from '../../src/index.js';
import { makeAlphaFixture } from './TextureAlphaFixtures.js';

interface AlphaReport {
	checks: number;
	failures: string[];
	webgl: boolean;
	backingSize: number[];
}

declare global {
	interface Window {
		runTextureAlphaChecks(crossOriginImageUrl: string): Promise<AlphaReport>;
	}
}

async function runTextureAlphaChecks(crossOriginImageUrl: string): Promise<AlphaReport> {
	const report: AlphaReport = { checks: 0, failures: [], webgl: false, backingSize: [] };
	const check = (condition: boolean, name: string): void => {
		report.checks++;
		if (!condition && report.failures.length < 20) {
			report.failures.push(name);
		}
	};
	const first = makeAlphaFixture(1, false);
	check(first.texture.hitTestAlpha(0, 0), 'usable before Player initialization');
	const canvas = document.querySelector('canvas')!;
	const params = new URLSearchParams(location.search);
	if (params.get('backend') === 'canvas') {
		canvas.getContext('2d');
	}
	const resolution = Number(params.get('resolution'));
	const app = kurot.createPlayer({ canvas, contentWidth: 64, contentHeight: 64, resolution, scaleMode: 'noScale' });
	try {
		report.webgl = app.player.isWebGL;
		report.backingSize = [canvas.width, canvas.height];
		const display = new kurot.Bitmap(first.texture);
		app.stage.addChild(display);
		app.player.render(false, 0);
		display.visible = false;
		display.alpha = 0;
		display.scaleX = 5;
		display.scaleY = 0.2;
		display.filters = [new kurot.BlurFilter(4, 4)];
		check(display.texture!.hitTestAlpha(0, 0), 'display state does not change original alpha');

		const coordinates = [-1.9, -1, -0.9, -0.1, 0, 0.99, 1.99, 2, 2.99, 3.99, 4, 5, NaN, Infinity];
		for (const density of [1, 2, 3]) {
			for (const rotated of [false, true]) {
				const fixtures = [makeAlphaFixture(density, rotated), makeAlphaFixture(density, rotated, true)];
				for (const y of coordinates) {
					for (const x of coordinates) {
						// Alternate differently placed frames on every coordinate, including
						// the two signs of animation offsets subtracted by the caller.
						for (const [index, fixture] of fixtures.entries()) {
							const { texture, alpha, width, height } = fixture;
							const frameX = index ? 4 : -5;
							const frameY = index ? -6 : 7;
							const localX = x + frameX - frameX;
							const localY = y + frameY - frameY;
							const column = Math.trunc(localX);
							const row = Math.trunc(localY);
							const expected = column >= 0 && row >= 0 && column < width && row < height &&
								alpha[row * width + column] !== 0;
							check(texture.hitTestAlpha(localX, localY) === expected,
								`${density}x/${rotated}/${index}: (${x},${y})`);
						}
					}
				}
				const fixture = fixtures[0];
				fixture.setFirstAlpha(0);
				check(!fixture.texture.hitTestAlpha(0, 0), 'mutable source clears without cached alpha');
				fixture.setFirstAlpha(1);
				check(fixture.texture.hitTestAlpha(0, 0), 'single physical alpha=1 pixel, no smoothing');
				kurot.BitmapData.invalidate(fixture.texture.bitmapData);
				check(fixture.texture.hitTestAlpha(0, 0), 'source invalidation retains current alpha');
			}
		}

		const empty = new kurot.Texture();
		check(!empty.hitTestAlpha(0, 0), 'missing texture after opaque sample');
		const fractional = makeAlphaFixture(1, false).texture;
		const fractionalView = new kurot.Texture(1.5);
		fractionalView.bitmapData = fractional.bitmapData;
		fractionalView.initData(fractional.bitmapX, fractional.bitmapY, 4, 3, 0, 0, 4, 3, 32, 32);
		check(fractionalView.hitTestAlpha(1.99, 0.99), 'truncate before fractional density mapping');
		check(!fractionalView.hitTestAlpha(3, 0), 'fractional density content boundary');

		const buffer = kurot.hitTestBuffer();
		const context = buffer.context;
		context.globalAlpha = 0;
		context.filter = 'blur(3px)';
		context.scale(2, 3);
		context.beginPath();
		context.rect(0, 0, 0, 0);
		context.clip();
		check(first.texture.hitTestAlpha(0, 0), 'reset inherited shared-buffer state');
		check(context.globalAlpha === 1 && context.filter === 'none' && context.getTransform().isIdentity,
			'restore neutral sampling state');
		check(buffer.getPixels(1, 1)[3] === 0, 'leave sampler empty after success');
		const image = new Image();
		image.src = crossOriginImageUrl;
		await image.decode();
		const tainted = new kurot.Texture();
		tainted.setBitmapData(new kurot.BitmapData(image));
		const source = tainted.bitmapData!.source;
		let propagated = false;
		try {
			tainted.hitTestAlpha(0, 0);
		} catch (error) {
			propagated = error instanceof DOMException && error.name === 'SecurityError';
		}
		check(propagated, 'propagate real cross-origin readback SecurityError');
		check(tainted.bitmapData?.source === source, 'never dispose the borrowed source on failure');
		check(buffer.getPixels(1, 1)[3] === 0, 'remove origin taint and stale pixels after error');
		check(first.texture.hitTestAlpha(0, 0), 'opaque sample recovers after readback error');
		check(!first.texture.hitTestAlpha(3, 0), 'transparent sample after recovery');

		const page = new kurot.Texture();
		page.setBitmapData(new kurot.BitmapData(first.context.canvas));
		const sheet = new kurot.SpriteSheet(page);
		const child = sheet.createTexture('content', 2, 8, 4, 3, 7, 3, 16, 16);
		const neighbor = sheet.createTexture('neighbor', 0, 0, 1, 1);
		check(child.hitTestAlpha(0, 0), 'SpriteSheet child samples the shared atlas');
		check(!child.hitTestAlpha(1, 1), 'SpriteSheet child preserves transparent hole');
		check(neighbor.hitTestAlpha(0, 0), 'other atlas view still alive');
		check(child.bitmapData === page.bitmapData && neighbor.bitmapData === page.bitmapData,
			'sampling preserves shared atlas ownership');
		const bitmap = new kurot.Bitmap(child);
		bitmap.pixelHitTest = true;
		check(bitmap.$hitTest(7, 3) === bitmap, 'existing Bitmap pixel hit still works');
		check(bitmap.$hitTest(8, 4) === undefined, 'existing Bitmap transparent hole remains empty');
		const capture = new kurot.RenderTexture();
		try {
			check(capture.drawToTexture(bitmap, new kurot.Rectangle(7, 3, 1, 1)) &&
				capture.getPixel32(0, 0)[3] === 255, 'RenderTexture retains real capture readback');
			check(capture.hitTestAlpha(0, 0), 'accepts captured textures too');
		} finally {
			capture.dispose();
		}
		const shape = new kurot.Shape();
		shape.graphics.beginFill(0xff0000);
		shape.graphics.drawRect(0, 0, 3, 3);
		shape.graphics.endFill();
		check(shape.$hitTest(1, 1) === shape, 'existing Graphics shared-buffer sampling still works');
		return report;
	} finally {
		app.destroy();
	}
}

window.runTextureAlphaChecks = runTextureAlphaChecks;
