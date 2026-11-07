import { Capabilities, Player, Rectangle, Sprite } from '@kurot/core';
import { Backdrop, Rect, UILayer } from '../../dist/index.js';

interface BackdropReport {
	backend: string;
	version: string;
	checks: number;
	failures: string[];
}

declare global {
	interface Window {
		runUIBackdropChecks(): BackdropReport;
	}
}

window.runUIBackdropChecks = (): BackdropReport => {
	const canvas = document.querySelector('canvas');
	if (!canvas) {
		throw new Error('Missing test canvas.');
	}
	const params = new URLSearchParams(location.search);
	if (params.get('backend') === 'canvas') {
		canvas.getContext('2d');
	}
	const density = Number(params.get('density'));
	Capabilities._init();
	const player = new Player(canvas);
	player.updateStageSize(160, 120, 160 * density, 120 * density);
	const gl = player.isWebGL ? canvas.getContext('webgl2') ?? canvas.getContext('webgl') : undefined;
	const report: BackdropReport = {
		backend: gl ? gl instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl1' : 'canvas',
		version: Capabilities.engineVersion, checks: 0, failures: [],
	};
	const check = (ok: boolean, label: string): void => {
		report.checks++;
		if (!ok) {
			report.failures.push(label);
		}
	};
	const background = new Sprite();
	background.touchEnabled = true;
	for (let x = 0; x < 240; x += 4) {
		background.graphics.beginFill(x % 8 ? 0xffffff : 0);
		background.graphics.drawRect(x, 0, 4, 200);
		background.graphics.endFill();
	}
	const layer = new UILayer();
	layer.touchThrough = true;
	const backdrop = new Backdrop({ blurX: 12, blurY: 12, quality: 1, resolution: 0.5 });
	backdrop.left = backdrop.right = backdrop.top = backdrop.bottom = 0;
	const popup = new Rect(10, 24, 0xff00aa);
	popup.x = 74;
	popup.y = 40;
	layer.addChild(backdrop);
	layer.addChild(popup);
	player.stage.addChild(background);
	player.stage.addChild(layer);
	const render = (): void => {
		layer.validateNow();
		player.render(false, 0);
	};
	const pixel = (x: number, y: number): number[] => {
		const px = Math.floor(x * canvas.width / player.stage.stageWidth);
		const py = Math.floor(y * canvas.height / player.stage.stageHeight);
		if (gl) {
			const bytes = new Uint8Array(4);
			// Renderer cleanup can leave a scratch framebuffer bound until the next
			// queued root activation. Read the displayed canvas explicitly.
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.readPixels(px, canvas.height - 1 - py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
			return Array.from(bytes);
		}
		return Array.from(canvas.getContext('2d')!.getImageData(px, py, 1, 1).data);
	};
	const same = (a: number[], b: number[], tolerance = 2): boolean => a.every((v, i) => Math.abs(v - b[i]) <= tolerance);
	try {
		backdrop.visible = false;
		render();
		const original = pixel(62, 35);
		const exterior = pixel(10, 35);
		const foreground = pixel(78, 45);
		const originalTarget = player.stage.$hitTest(62, 35);
		backdrop.visible = true;
		render();
		const blurred = pixel(62, 35);
		check(blurred[0] > 25 && blurred[0] < 230 && !same(original, blurred, 8), 'background is blurred');
		check(same(foreground, pixel(78, 45), 0), 'later popup is sharp');
		check(player.stage.$hitTest(62, 35) === originalTarget && originalTarget === background, 'input passes through');
		check(player.stage.$hitTest(78, 45) === popup, 'popup still accepts input');
		background.x = 58;
		render();
		check(!same(blurred, pixel(62, 35), 0), 'background movement updates the blur');
		background.x = 0;
		backdrop.alpha = 0;
		render();
		check(same(original, pixel(62, 35), 0), 'zero opacity preserves background');
		backdrop.alpha = 0.5;
		render();
		check(Math.abs(pixel(62, 35)[0] - (original[0] + blurred[0]) / 2) <= 4, 'opacity mixes original and blurred pixels');
		backdrop.alpha = 1;
		const child = backdrop.getChildAt(0);
		for (let cycle = 0; cycle < 10; cycle++) {
			layer.removeChild(backdrop);
			render();
			check(same(original, pixel(62, 35), 0), `removal restores background ${cycle}`);
			layer.addChildAt(backdrop, 0);
			render();
			check(same(blurred, pixel(62, 35)), `reattachment restores blur ${cycle}`);
			check(backdrop.getChildAt(0) === child && backdrop.numChildren === 1, `effect reuse ${cycle}`);
		}
		for (const [width, height] of [[200, 140], [100, 80], [160, 120]]) {
			player.updateStageSize(width, height, width * density, height * density);
			render();
			check(backdrop.width === width && backdrop.height === height, `automatic fill ${width}x${height}`);
			check(pixel(width - 6, 25)[0] > 25 && pixel(width - 6, 25)[0] < 230, 'resized edge is blurred');
		}
		const upper = new Backdrop({ blurX: 12, blurY: 12, resolution: 0.5 });
		upper.left = upper.right = upper.top = upper.bottom = 0;
		const upperPopup = new Rect(12, 20, 0x00ff00);
		upperPopup.x = 110;
		upperPopup.y = 40;
		layer.addChild(upper);
		layer.addChild(upperPopup);
		render();
		check(!same(foreground, pixel(78, 45), 8), 'upper backdrop blurs the lower popup');
		check(same(pixel(114, 45), [0, 255, 0, 255], 0), 'upper popup stays sharp');
		layer.removeChild(upperPopup);
		layer.removeChild(upper);
		render();
		check(same(foreground, pixel(78, 45), 0), 'removing upper backdrop restores lower popup');
		backdrop.left = 20;
		backdrop.right = 30;
		backdrop.top = 10;
		backdrop.bottom = 20;
		render();
		check(backdrop.x === 20 && backdrop.y === 10 && backdrop.width === 110 && backdrop.height === 90, 'regional constraints');
		check(same(pixel(10, 35), exterior, 0), 'outside region is unchanged');
		check(pixel(62, 35)[0] > 25 && pixel(62, 35)[0] < 230, 'inside region remains blurred');
		backdrop.scrollRect = new Rectangle(0, 0, 40, 50);
		render();
		check(same(pixel(62, 35), original, 0), 'UI scroll clip excludes background outside viewport');
		check(pixel(42, 35)[0] > 25 && pixel(42, 35)[0] < 230, 'UI scroll clip preserves inner blur');
		backdrop.scrollRect = undefined;
		backdrop.left = backdrop.right = backdrop.top = backdrop.bottom = NaN;
		backdrop.width = 80;
		backdrop.height = 50;
		backdrop.x = 20;
		backdrop.y = 20;
		backdrop.rotation = 17;
		backdrop.scaleX = 0.8;
		backdrop.flipX = true;
		backdrop.visible = false;
		render();
		const point = backdrop.localToGlobal(40, 25);
		const sharp = pixel(point.x, point.y);
		backdrop.visible = true;
		render();
		check(!same(sharp, pixel(point.x, point.y), 8), 'scaled/rotated/flipped UI effect still blurs');
		check(same(pixel(10, 10), [0, 0, 0, 255], 0), 'transform leaves exterior unchanged');
		backdrop.cacheAsTexture(true);
		let cacheRejected = false;
		try {
			render();
		} catch (error) {
			cacheRejected = error instanceof Error && error.message.includes('BackdropBlur');
		} finally {
			backdrop.cacheAsTexture(false);
		}
		check(cacheRejected, 'cached UI ancestor is rejected');
		render();
		check(!same(sharp, pixel(point.x, point.y), 8), 'cache error recovery preserves effect');
		return report;
	} finally {
		player.stage.removeChildren();
		player.destroy();
	}
};
