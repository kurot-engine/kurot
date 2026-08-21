import { StageScaleMode, createPlayer } from '../../src/index.js';
import type { KurotApp } from '../../src/index.js';
import { buildGoldenScene } from './GoldenScenes.js';

type GoldenBackend = 'canvas2d' | 'webgl1' | 'webgl2';

interface VisualGoldenState {
	status: 'initializing' | 'ready' | 'error';
	backend: GoldenBackend;
	error?: string;
	supportsContextRestore: boolean;
	restoreContext(): Promise<void>;
}

declare global {
	interface Window {
		__KUROT_VISUAL_GOLDEN__: VisualGoldenState;
	}
}

const WIDTH = 640;
const HEIGHT = 480;
const canvas = requireCanvas();
const backend = readBackend(new URLSearchParams(location.search).get('backend'));
const state: VisualGoldenState = {
	status: 'initializing',
	backend,
	supportsContextRestore: false,
	async restoreContext() {},
};
window.__KUROT_VISUAL_GOLDEN__ = state;

void initialize().catch((error: unknown) => {
	state.status = 'error';
	state.error = error instanceof Error ? error.stack ?? error.message : String(error);
});

async function initialize(): Promise<void> {
	lockBackend(canvas, backend);
	const app = createPlayer({
		canvas,
		contentWidth: WIDTH,
		contentHeight: HEIGHT,
		scaleMode: StageScaleMode.SHOW_ALL,
		frameRate: 60,
	});
	verifyBackend(app, canvas, backend);
	const root = buildGoldenScene();
	app.start(root);
	app.stop();
	renderStableFrame(app);
	configureContextRestore(app, canvas, state);
	state.status = 'ready';
}

function renderStableFrame(app: KurotApp): void {
	app.player.render(true, 0);
	app.player.render(true, 0);
}

function configureContextRestore(app: KurotApp, target: HTMLCanvasElement, targetState: VisualGoldenState): void {
	if (!app.player.isWebGL) return;
	const gl = target.getContext('webgl2') ?? target.getContext('webgl');
	if (!gl) return;
	const extension = gl.getExtension('WEBGL_lose_context');
	if (!extension) return;
	targetState.supportsContextRestore = true;
	targetState.restoreContext = async (): Promise<void> => {
		const lost = once(target, 'webglcontextlost', 5000);
		extension.loseContext();
		await lost;
		await delay(100);
		const restored = once(target, 'webglcontextrestored', 5000);
		extension.restoreContext();
		await restored;
		readGlErrors(gl);
		await nextFrame();
		app.player.render(true, 0);
		const firstErrors = readGlErrors(gl);
		app.player.render(true, 0);
		const secondErrors = readGlErrors(gl);
		if (firstErrors.length > 0 || secondErrors.length > 0) {
			throw new Error(
				`WebGL errors after context restoration: first=${firstErrors.join(',')}; second=${secondErrors.join(',')}.`,
			);
		}
	};
}

function lockBackend(target: HTMLCanvasElement, requested: GoldenBackend): void {
	const context = requested === 'canvas2d' ? target.getContext('2d') : target.getContext(requested === 'webgl2' ? 'webgl2' : 'webgl');
	if (!context) throw new Error(`Requested visual backend ${requested} is unavailable.`);
}

function verifyBackend(app: KurotApp, target: HTMLCanvasElement, requested: GoldenBackend): void {
	const actual = app.player.isWebGL ? (target.getContext('webgl2') ? 'webgl2' : 'webgl1') : 'canvas2d';
	if (actual !== requested) throw new Error(`Requested ${requested}, but Kurot initialized ${actual}.`);
}

function readBackend(value: string | null): GoldenBackend {
	return value === 'canvas2d' || value === 'webgl1' ? value : 'webgl2';
}

function requireCanvas(): HTMLCanvasElement {
	const target = document.querySelector<HTMLCanvasElement>('#golden');
	if (!target) throw new Error('Visual golden canvas is missing.');
	return target;
}

function once(target: EventTarget, type: string, timeoutMs: number): Promise<void> {
	return new Promise((resolve, reject) => {
		const timeout = window.setTimeout(() => reject(new Error(`Timed out waiting for ${type}.`)), timeoutMs);
		target.addEventListener(
			type,
			() => {
				window.clearTimeout(timeout);
				resolve();
			},
			{ once: true },
		);
	});
}

function nextFrame(): Promise<void> {
	return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

function delay(milliseconds: number): Promise<void> {
	return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

function readGlErrors(gl: WebGLRenderingContext | WebGL2RenderingContext): number[] {
	const errors: number[] = [];
	for (let error = gl.getError(); error !== gl.NO_ERROR; error = gl.getError()) {
		errors.push(error);
	}
	return errors;
}
