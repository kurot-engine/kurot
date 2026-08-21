import { Bitmap, BitmapData, BlurFilter, Shape, Sprite, StageScaleMode, Texture, createPlayer } from '../../../src/index.js';

interface SoakSnapshot {
	cycles: number;
	heapUsedBytes?: number;
	framebufferPoolSize: number;
	framebufferPoolBytes: number;
	drawCalls: number;
}

interface ResourceSoakState {
	status: 'ready' | 'running' | 'error';
	error?: string;
	runCycles(count: number): Promise<SoakSnapshot>;
	restoreContext(): Promise<void>;
	snapshot(): SoakSnapshot;
}

declare global {
	interface Window {
		__KUROT_RESOURCE_SOAK__: ResourceSoakState;
	}
}

const canvas = requireCanvas();
const app = createPlayer({
	canvas,
	contentWidth: 640,
	contentHeight: 480,
	scaleMode: StageScaleMode.NO_SCALE,
});
const root = new Sprite();
let cycles = 0;
app.start(root);
app.stop();

const state: ResourceSoakState = {
	status: 'ready',
	async runCycles(count: number): Promise<SoakSnapshot> {
		state.status = 'running';
		try {
			for (let i = 0; i < count; i++) {
				runLifecycleCycle(i);
				if (i % 20 === 19) await nextFrame();
			}
			state.status = 'ready';
			const result = state.snapshot();
			show(result);
			return result;
		} catch (error: unknown) {
			state.status = 'error';
			state.error = error instanceof Error ? error.stack ?? error.message : String(error);
			throw error;
		}
	},
	async restoreContext(): Promise<void> {
		const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
		const extension = gl?.getExtension('WEBGL_lose_context');
		if (!gl || !extension) throw new Error('WEBGL_lose_context is unavailable.');
		const lost = once(canvas, 'webglcontextlost');
		extension.loseContext();
		await lost;
		await delay(100);
		const restored = once(canvas, 'webglcontextrestored');
		extension.restoreContext();
		await restored;
		await nextFrame();
		app.player.render(true, 0);
		if (gl.getError() !== gl.NO_ERROR) throw new Error('WebGL reported an error after context restoration.');
	},
	snapshot(): SoakSnapshot {
		return {
			cycles,
			heapUsedBytes: readHeapUsedBytes(),
			framebufferPoolSize: app.player.framebufferPoolSize,
			framebufferPoolBytes: app.player.framebufferPoolBytes,
			drawCalls: app.player.perf.drawCalls,
		};
	},
};
window.__KUROT_RESOURCE_SOAK__ = state;
show(state.snapshot());

function runLifecycleCycle(index: number): void {
	const scene = new Sprite();
	const textures: Texture[] = [];
	for (let i = 0; i < 16; i++) {
		const texture = makeTexture(index + i);
		textures.push(texture);
		const bitmap = new Bitmap(texture);
		bitmap.x = (i % 8) * 72;
		bitmap.y = Math.floor(i / 8) * 72;
		scene.addChild(bitmap);
	}
	for (let i = 0; i < 6; i++) {
		const shape = new Shape();
		shape.graphics.beginFill(0x3366ff + i * 0x111100);
		shape.graphics.drawRect(0, 0, 48 + i * 7, 36 + i * 5);
		shape.graphics.endFill();
		shape.x = 40 + i * 90;
		shape.y = 210;
		shape.filters = [new BlurFilter(2 + i, 2 + i)];
		scene.addChild(shape);
	}
	root.addChild(scene);
	app.player.render(true, 0);
	root.removeChild(scene);
	for (const texture of textures) texture.dispose();
	app.player.render(true, 0);
	cycles++;
}

function makeTexture(seed: number): Texture {
	const source = document.createElement('canvas');
	source.width = 64;
	source.height = 64;
	const context = source.getContext('2d');
	if (!context) throw new Error('Canvas 2D is unavailable.');
	context.fillStyle = `hsl(${seed % 360}, 75%, 55%)`;
	context.fillRect(0, 0, 64, 64);
	const texture = new Texture();
	texture.setBitmapData(new BitmapData(source));
	return texture;
}

function readHeapUsedBytes(): number | undefined {
	const memory = (performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory;
	return memory?.usedJSHeapSize;
}

function requireCanvas(): HTMLCanvasElement {
	const target = document.querySelector<HTMLCanvasElement>('#soak');
	if (!target) throw new Error('Resource soak canvas is missing.');
	return target;
}

function show(snapshot: SoakSnapshot): void {
	const target = document.querySelector('#status');
	if (target) target.textContent = JSON.stringify(snapshot, null, 2);
}

function nextFrame(): Promise<void> {
	return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

function delay(milliseconds: number): Promise<void> {
	return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

function once(target: EventTarget, type: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const timeout = window.setTimeout(() => reject(new Error(`Timed out waiting for ${type}.`)), 5000);
		target.addEventListener(type, () => {
			window.clearTimeout(timeout);
			resolve();
		}, { once: true });
	});
}
