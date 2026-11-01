import { BitmapData, WebGLRenderContext } from '../../src/index.js';

interface PixelResult {
	readonly name: string;
	readonly createError: number;
	readonly updateError: number;
}

const input = new Uint8ClampedArray([
	200, 100, 50, 128, 40, 160, 240, 64,
	12, 90, 180, 255, 255, 0, 255, 0,
]);

async function verify(): Promise<object> {
	const backend = new URLSearchParams(location.search).get('backend');
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = 2;
	if (!canvas.getContext(backend === 'webgl1' ? 'webgl' : 'webgl2')) {
		throw new Error(`${backend} is unavailable.`);
	}
	const renderer = new WebGLRenderContext(canvas);
	const gl = renderer.gl;
	const pixels: PixelResult[] = [];
	for (const alpha of ['none', 'premultiply', 'default'] as const) {
		for (const declared of alpha === 'premultiply' ? [false, true] : [false]) {
			const source = await createImageBitmap(new ImageData(input, 2, 2), { premultiplyAlpha: alpha });
			const changed = input.map((value, index) => index % 4 === 0 ? Math.floor(value / 2) : value);
			const replacement = await createImageBitmap(new ImageData(changed, 2, 2), { premultiplyAlpha: alpha });
			const texture = renderer.createTexture(source, declared);
			try {
				const createError = pixelError(gl, texture, input);
				renderer.updateTexture(texture, replacement, declared);
				pixels.push({
					name: `${alpha}/declared=${declared}`,
					createError,
					updateError: pixelError(gl, texture, changed),
				});
			} finally {
				renderer.deleteTexture(texture);
				source.close();
				replacement.close();
			}
		}
	}
	const owned = await decoded();
	const data = new BitmapData(owned);
	data.premultipliedAlpha = true;
	const texture = renderer.getWebGLTexture(data);
	if (!texture || !gl.isTexture(texture)) {
		throw new Error('Missing owned texture upload.');
	}
	data.dispose();
	data.dispose();
	const ownedReleased = owned.width === 0 && !gl.isTexture(texture);
	const borrowed = await decoded();
	const view = new BitmapData(borrowed);
	view.premultipliedAlpha = true;
	view.deleteSource = false;
	const borrowedTexture = renderer.getWebGLTexture(view);
	view.dispose();
	const borrowedRetained = borrowed.width === 2 && !gl.isTexture(borrowedTexture ?? null);
	borrowed.close();
	const restoration = await verifyRestoration(renderer);
	return { backend, webgl2: renderer.isWebGL2, pixels, ownedReleased, borrowedRetained, restoration, glError: gl.getError() };
}

function decoded(): Promise<ImageBitmap> {
	return createImageBitmap(new ImageData(input, 2, 2), { premultiplyAlpha: 'premultiply' });
}

function pixelError(
	gl: WebGLRenderingContext | WebGL2RenderingContext,
	texture: WebGLTexture,
	expected: Uint8ClampedArray,
): number {
	const framebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	try {
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
		if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
			throw new Error('Incomplete pixel-check framebuffer.');
		}
		const actual = new Uint8Array(expected.length);
		gl.readPixels(0, 0, 2, 2, gl.RGBA, gl.UNSIGNED_BYTE, actual);
		let error = 0;
		for (let i = 0; i < actual.length; i++) {
			const alpha = expected[Math.floor(i / 4) * 4 + 3];
			const value = i % 4 === 3 ? alpha : Math.round(expected[i] * alpha / 255);
			error = Math.max(error, Math.abs(actual[i] - value));
		}
		return error;
	} finally {
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.deleteFramebuffer(framebuffer);
	}
}

async function verifyRestoration(renderer: WebGLRenderContext): Promise<{ supported: boolean; pixelError?: number; released?: boolean }> {
	const extension = renderer.gl.getExtension('WEBGL_lose_context');
	if (!extension) {
		return { supported: false };
	}
	const data = new BitmapData(await decoded());
	data.premultipliedAlpha = true;
	const old = renderer.getWebGLTexture(data);
	const lost = nextEvent(renderer.surface, 'webglcontextlost');
	extension.loseContext();
	await lost;
	// The browser enables restoration after the context-lost event task finishes.
	await new Promise<void>(resolve => setTimeout(resolve, 0));
	const restored = nextEvent(renderer.surface, 'webglcontextrestored');
	extension.restoreContext();
	await restored;
	const current = renderer.getWebGLTexture(data);
	if (!current || current === old) {
		throw new Error('Restoration did not replace the texture.');
	}
	const error = pixelError(renderer.gl, current, input);
	data.dispose();
	return { supported: true, pixelError: error, released: !renderer.gl.isTexture(current) };
}

function nextEvent(canvas: HTMLCanvasElement, type: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			canvas.removeEventListener(type, onEvent);
			reject(new Error(`Timed out waiting for ${type}.`));
		}, 10_000);
		function onEvent(): void {
			clearTimeout(timeout);
			resolve();
		}
		canvas.addEventListener(type, onEvent, { once: true });
	});
}

void verify().then(
	result => { document.body.dataset.result = JSON.stringify(result); },
	error => { document.body.dataset.result = JSON.stringify({ error: String(error) }); },
);
