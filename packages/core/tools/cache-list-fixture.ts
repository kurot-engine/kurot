import { Bitmap, BitmapData, CanvasRenderer, createPlayer, TextField, Texture, WebGLRenderContext } from '@kurot/core';
import { ArrayCollection, ItemRenderer, List, Scroller, VerticalLayout } from '../../ui/src/index.js';

interface Row {
	id: number;
}

const canvas = document.querySelector('canvas')!;
const params = new URLSearchParams(location.search);
const cached = params.get('cached') === 'true';
const workload = params.get('workload') ?? 'scroll';
canvas.getContext('webgl2');
const app = createPlayer({ canvas, contentWidth: 640, contentHeight: 480, resolution: 1 });
app.player.updateStageSize(640, 480, 640, 480);
const textures = Array.from({ length: 16 }, (_, i) => {
	const source = document.createElement('canvas');
	source.width = source.height = 20;
	const context = source.getContext('2d')!;
	context.fillStyle = `hsl(${i * 21} 70% 55%)`;
	context.fillRect(0, 0, 20, 20);
	const texture = new Texture();
	texture.bitmapData = new BitmapData(source);
	texture.initData(0, 0, 20, 20, 0, 0, 20, 20, 20, 20);
	return texture;
});
const renderers = new Set<RowRenderer>();

class RowRenderer extends ItemRenderer<string, Row> {
	public readonly icon: Bitmap;
	private readonly _label = new TextField();

	public constructor() {
		super();
		this.width = 600;
		this.height = 52;
		this.icon = new Bitmap(textures[0]);
		this.addChild(this.icon);
		for (let i = 1; i < 24; i++) {
			const icon = new Bitmap(textures[i % textures.length]);
			icon.x = i * 24;
			this.addChild(icon);
		}
		this._label.size = 14;
		this._label.y = 25;
		this.addChild(this._label);
		this.cacheAsBitmap = cached;
		renderers.add(this);
	}

	protected override dataChanged(): void {
		this._label.text = `Item ${this.data?.id ?? 0} — Price 100`;
	}
}

const list = new List<Row>();
const layout = new VerticalLayout();
layout.gap = 4;
layout.useVirtualLayout = true;
list.layout = layout;
list.itemRenderer = RowRenderer;
list.dataProvider = new ArrayCollection(Array.from({ length: 200 }, (_, id) => ({ id })));
const scroller = new Scroller();
scroller.width = 620;
scroller.height = 440;
scroller.viewport = list;
app.stage.addChild(scroller);

let uploads = 0;
let canvasPasses = 0;
let draws = 0;
let allocations = 0;
const createTexture = WebGLRenderContext.prototype.createTexture;
const updateTexture = WebGLRenderContext.prototype.updateTexture;
const canvasRender = CanvasRenderer.prototype.renderToContext;
WebGLRenderContext.prototype.createTexture = function (...args) {
	uploads++;
	return createTexture.apply(this, args);
};
WebGLRenderContext.prototype.updateTexture = function (...args) {
	uploads++;
	return updateTexture.apply(this, args);
};
CanvasRenderer.prototype.renderToContext = function (...args) {
	canvasPasses++;
	return canvasRender.apply(this, args);
};
const gl = canvas.getContext('webgl2')!;
const draw = gl.drawElements.bind(gl);
gl.drawElements = (...args): void => {
	draws++;
	draw(...args);
};
const allocate = gl.createTexture.bind(gl);
gl.createTexture = (): WebGLTexture => {
	allocations++;
	return allocate();
};

async function measure(): Promise<Record<string, unknown>> {
	const samples: number[] = [];
	let started = 0;
	for (let frame = 0; frame < 180; frame++) {
		await new Promise(requestAnimationFrame);
		if (frame === 60) {
			uploads = canvasPasses = draws = allocations = 0;
			started = performance.now();
		}
		list.scrollV = (frame * 2) % 180;
		scroller.validateNow();
		list.validateNow();
		if (workload === 'content') {
			for (const renderer of renderers) {
				renderer.icon.alpha = frame % 2 ? 0.5 : 1;
			}
		}
		const before = performance.now();
		app.player.render(true, 0);
		if (frame >= 60) {
			samples.push(performance.now() - before);
		}
	}
	const elapsed = performance.now() - started;
	samples.sort((a, b) => a - b);
	const device = gl.getExtension('WEBGL_debug_renderer_info');
	const result = {
		cached, workload, frames: samples.length, fps: 119000 / elapsed,
		renderMeanMs: samples.reduce((sum, n) => sum + n, 0) / samples.length,
		renderP95Ms: samples[Math.floor(samples.length * 0.95)],
		drawsPerFrame: draws / samples.length, uploads, canvasPasses, allocations,
		renderers: renderers.size, contentHeight: list.contentHeight, error: gl.getError(),
		renderer: gl.getParameter(device ? device.UNMASKED_RENDERER_WEBGL : gl.RENDERER) as string,
	};
	scroller.viewport = undefined;
	app.destroy();
	return result;
}

declare global {
	interface Window {
		cacheListResult: Promise<Record<string, unknown>>;
	}
}
window.cacheListResult = measure();
