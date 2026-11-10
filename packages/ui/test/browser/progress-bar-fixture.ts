import { Capabilities, Player, ticker } from '@kurot/core';
import { Label, ProgressBar, Rect, Skin } from '../../dist/index.js';

function mountProgressAnimation(backend: 'canvas' | 'webgl1' | 'webgl2') {
	const canvas = document.querySelector('canvas')!;
	const context2d = backend === 'canvas' ? canvas.getContext('2d') : undefined;
	const gl = backend === 'webgl1' ? canvas.getContext('webgl', { preserveDrawingBuffer: true })
		: backend === 'webgl2' ? canvas.getContext('webgl2', { preserveDrawingBuffer: true }) : undefined;
	if (!context2d && !gl) {
		throw new Error(`Missing ${backend} context`);
	}
	const originalNow = Date.now;
	let now = originalNow();
	Date.now = () => now;
	Capabilities._init();
	const player = new Player(canvas);
	player.updateStageSize(240, 80, 240, 80);
	const bar = new ProgressBar();
	bar.x = bar.y = 10;
	bar.width = 200;
	bar.height = 60;
	const track = new Rect(200, 20, 0x112233);
	const thumb = new Rect(200, 20, 0x22cc66);
	const label = new Label();
	label.y = 30;
	label.width = 200;
	label.height = 30;
	label.size = 14;
	const skin = new Skin();
	skin.skinParts = ['thumb', 'labelDisplay'];
	skin.setPart('thumb', thumb);
	skin.setPart('labelDisplay', label);
	skin.elementsContent = [track, thumb, label];
	bar.skinName = skin;
	player.stage.addChild(bar);
	bar.slideDuration = 0;
	bar.maximum = 2000;
	bar.value = 1600;
	let changes = 0;
	bar.addEventListener('change', () => changes++);

	function pixel(x: number, y: number): number[] {
		if (context2d) {
			return Array.from(context2d.getImageData(x, y, 1, 1).data);
		}
		const bytes = new Uint8Array(4);
		gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
		gl!.readPixels(x, canvas.height - y - 1, 1, 1, gl!.RGBA, gl!.UNSIGNED_BYTE, bytes);
		return Array.from(bytes);
	}

	function snapshot() {
		bar.validateNow();
		player.render(false, 0);
		return {
			value: bar.value, ratio: bar.ratio, text: label.text, changes,
			clip: thumb.scrollRect?.width, width: thumb.width,
			inside: pixel(30, 20), tail: pixel(190, 20),
			partsBound: bar.thumb === thumb && bar.labelDisplay === label,
		};
	}

	return {
		snapshot,
		shrink() {
			bar.slideDuration = 500;
			bar.maximum = 266;
			bar.value = 120;
		},
		advance(milliseconds: number) {
			now += milliseconds;
			ticker.update(true);
			return snapshot();
		},
		retarget() {
			bar.value = 200;
			bar.value = 40;
		},
		collapse() {
			bar.maximum = 0;
			return snapshot();
		},
		destroy(): void {
			bar.slideDuration = 0;
			player.destroy();
			ticker.stop();
			Date.now = originalNow;
		},
	};
}

declare global {
	interface Window {
		mountProgressAnimation: typeof mountProgressAnimation;
		progressAnimation: ReturnType<typeof mountProgressAnimation>;
	}
}

window.mountProgressAnimation = mountProgressAnimation;
