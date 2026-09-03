import { afterEach, describe, it, expect, vi } from 'vitest';
import { TextPipe } from '../src/kurot/player/pipes/TextPipe.js';
import { TextField } from '../src/kurot/text/TextField.js';
import type { CanvasRenderer } from '../src/kurot/player/canvas/index.js';
import type { CanvasBuffer } from '../src/kurot/player/canvas/index.js';
import type { RenderBuffer } from '../src/kurot/player/RenderBuffer.js';

// Minimal stand-in for a WebGLTexture — the pipe never inspects its shape.
function mockTexture(): WebGLTexture {
	return {} as WebGLTexture;
}

function mockContext(): { deleteTexture: ReturnType<typeof vi.fn>; unregisterTextureGC: ReturnType<typeof vi.fn> } {
	return { deleteTexture: vi.fn(), unregisterTextureGC: vi.fn() };
}

// Reach into TextPipe's private cache/token maps directly. There is no public
// API to seed a texture without a real WebGL context, and happy-dom doesn't
// implement one, so this mirrors the `as unknown as {...}` pattern already
// used in InstructionSet.test.ts for whitebox access.
interface TextPipeInternals {
	_cache: WeakMap<TextField, { texture: WebGLTexture | undefined; canvasBuffer: CanvasBuffer }>;
	_registryTokens: WeakMap<TextField, object>;
	// Untyped on purpose: real code assigns a `RenderContext` instance, tests
	// assign a vi.fn()-based mock. Both only need to support
	// `.deleteTexture(texture)` / `.unregisterTextureGC(token)`.
	_context: unknown;
}

function internals(pipe: TextPipe): TextPipeInternals {
	return pipe as unknown as TextPipeInternals;
}

function seedCache(pipe: TextPipe, tf: TextField, texture: WebGLTexture | undefined): void {
	internals(pipe)._cache.set(tf, {
		texture,
		canvasBuffer: {} as CanvasBuffer,
	});
}

describe('TextPipe', () => {
	afterEach(() => vi.restoreAllMocks());

	it('rasterizes text at the renderer resolution', () => {
		const context2d = {
			setTransform: vi.fn(),
			clearRect: vi.fn(),
			measureText: vi.fn(() => ({ width: 20 })),
		} as unknown as CanvasRenderingContext2D;
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context2d);

		const texture = mockTexture();
		const context = {
			contextVersion: 0,
			resolution: 2,
			maxTextureSize: 4096,
			createTexture: vi.fn(() => texture),
			updateTexture: vi.fn(),
			registerTextureForGC: vi.fn(),
			unregisterTextureGC: vi.fn(),
			deleteTexture: vi.fn(),
			drawTexture: vi.fn(),
		};
		const buffer = {
			context,
			offsetX: 0,
			offsetY: 0,
		} as unknown as RenderBuffer;
		const canvasRenderer = {
			renderTextFieldToContext: vi.fn(),
		} as unknown as CanvasRenderer;
		const pipe = new TextPipe(canvasRenderer);
		const tf = new TextField();
		tf.text = 'Hi';
		tf.width = 100;
		tf.height = 40;

		pipe.execute({ renderPipeId: 'text', renderable: tf, offsetX: 0, offsetY: 0 }, buffer);

		const surface = context.createTexture.mock.calls[0][0] as HTMLCanvasElement;
		expect(surface.width).toBe(200);
		expect(surface.height).toBe(80);
		expect(context2d.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
		expect(context.drawTexture).toHaveBeenCalledWith(
			texture,
			0,
			0,
			200,
			80,
			0,
			0,
			100,
			40,
			200,
			80,
		);
	});

	it('destroyRenderable deletes the cached GPU texture', () => {
		const pipe = new TextPipe({} as CanvasRenderer);
		const tf = new TextField();
		const texture = mockTexture();
		const context = mockContext();

		internals(pipe)._context = context;
		seedCache(pipe, tf, texture);
		const token = {};
		internals(pipe)._registryTokens.set(tf, token);

		pipe.destroyRenderable(tf);

		expect(context.deleteTexture).toHaveBeenCalledWith(texture);
		expect(context.unregisterTextureGC).toHaveBeenCalledWith(token);
		expect(internals(pipe)._registryTokens.get(tf)).toBeUndefined();
	});

	it('destroyRenderable removes the cache entry so a later lookup misses', () => {
		const pipe = new TextPipe({} as CanvasRenderer);
		const tf = new TextField();
		seedCache(pipe, tf, mockTexture());
		internals(pipe)._context = mockContext();

		pipe.destroyRenderable(tf);

		// WeakMap has no public "has" check via get() returning undefined.
		expect(internals(pipe)._cache.get(tf)).toBeUndefined();
	});

	it('destroyRenderable on a TextField with no cache entry is a no-op', () => {
		const pipe = new TextPipe({} as CanvasRenderer);
		const tf = new TextField();
		const context = mockContext();
		internals(pipe)._context = context;

		expect(() => pipe.destroyRenderable(tf)).not.toThrow();
		expect(context.deleteTexture).not.toHaveBeenCalled();
	});

	it('destroyRenderable on a cache entry with no texture yet does not call deleteTexture', () => {
		const pipe = new TextPipe({} as CanvasRenderer);
		const tf = new TextField();
		const context = mockContext();
		internals(pipe)._context = context;
		seedCache(pipe, tf, undefined);

		pipe.destroyRenderable(tf);

		expect(context.deleteTexture).not.toHaveBeenCalled();
	});

	it('destroyRenderable without a cached render context does not throw', () => {
		// execute() hasn't run yet, so _context is still undefined —
		// destroyRenderable must not crash trying to call deleteTexture on it.
		const pipe = new TextPipe({} as CanvasRenderer);
		const tf = new TextField();
		seedCache(pipe, tf, mockTexture());

		expect(() => pipe.destroyRenderable(tf)).not.toThrow();
		expect(internals(pipe)._cache.get(tf)).toBeUndefined();
	});
});
