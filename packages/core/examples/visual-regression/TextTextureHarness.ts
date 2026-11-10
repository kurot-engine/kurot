import type {} from './FilterHarness.js';

interface TextTextureSample {
	rasters: number;
	uploads: number;
	draws: number;
	image: number;
	errors: number[];
}

declare global {
	interface Window {
		textTextureProbe: { sample(): TextTextureSample };
	}
}

/**
 * Instruments real text rasterization and Canvas-source GL uploads per frame.
 * Execute inside page.evaluate; each test owns and closes its browser page.
 */
export function installTextTextureProbe(): void {
	const h = window.filterHarness;
	const { CanvasRenderer } = h.kurot;
	const sources = new WeakSet<object>();
	let rasters = 0;
	let uploads = 0;
	const raster = CanvasRenderer.prototype.renderTextFieldToContext;
	CanvasRenderer.prototype.renderTextFieldToContext = function (...args) {
		rasters++;
		sources.add(args[1].canvas);
		return raster.apply(this, args);
	};
	h.gl.texImage2D = new Proxy(h.gl.texImage2D, {
		apply(target, receiver, args) {
			if (args.length === 6 && sources.has(args[5])) {
				uploads++;
			}
			return Reflect.apply(target, receiver, args);
		},
	});
	window.textTextureProbe = {
		sample(): TextTextureSample {
			rasters = uploads = 0;
			const draws = h.render();
			const { gl } = h;
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
			gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
			let image = 2166136261;
			for (const byte of pixels) {
				image = Math.imul(image ^ byte, 16777619) >>> 0;
			}
			return { rasters, uploads, draws, image, errors: h.errors() };
		},
	};
}
