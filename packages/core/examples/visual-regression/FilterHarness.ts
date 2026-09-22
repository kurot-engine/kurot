import * as kurot from '../../src/index.js';
import { createProgram, WEBGL_CONTEXT_ATTRIBUTES, type GL } from '../../src/kurot/player/webgl/WebGLUtils.js';
import { ShaderLib2 } from '../../src/kurot/player/webgl/shaders/ShaderLib2.js';

export interface FilterHarness {
	kurot: typeof kurot;
	app: kurot.KurotApp;
	root: kurot.Sprite;
	gl: GL;
	createProgram: typeof createProgram;
	shaders: typeof kurot.ShaderLib | typeof ShaderLib2;
	render(): number;
	pixel(x: number, y: number): number[];
	errors(): number[];
}

declare global {
	interface Window {
		filterHarness: FilterHarness;
	}
}

const canvas = document.querySelector<HTMLCanvasElement>('#filters')!;
const params = new URLSearchParams(location.search);
const backend = params.get('backend') === 'webgl1' ? 'webgl' : 'webgl2';
const gl = canvas.getContext(backend, WEBGL_CONTEXT_ATTRIBUTES) as GL | null;
if (!gl) throw new Error(`Unavailable backend: ${backend}`);
const resolution = Number(params.get('resolution') ?? 1);
const app = kurot.createPlayer({ canvas, contentWidth: 256, contentHeight: 256, resolution });
const root = new kurot.Sprite();
app.start(root);
app.stop();
let draws = 0;
const drawElements = gl.drawElements.bind(gl);
gl.drawElements = (...args: Parameters<GL['drawElements']>): void => {
	draws++;
	drawElements(...args);
};

window.filterHarness = {
	kurot, app, root, gl, createProgram,
	shaders: backend === 'webgl2' ? ShaderLib2 : kurot.ShaderLib,
	render(): number {
		draws = 0;
		app.player.render(true, 0);
		return draws;
	},
	pixel(x: number, y: number): number[] {
		const bytes = new Uint8Array(4);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.readPixels(Math.floor(x * resolution), canvas.height - 1 - Math.floor(y * resolution), 1, 1,
			gl.RGBA, gl.UNSIGNED_BYTE, bytes);
		return Array.from(bytes);
	},
	errors(): number[] {
		const errors: number[] = [];
		for (let error = gl.getError(); error !== gl.NO_ERROR; error = gl.getError()) {
			errors.push(error);
		}
		return errors;
	},
};
