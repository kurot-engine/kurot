import { describe, it, expect, vi } from 'vitest';
import { TextPipe } from '../src/blakron/player/webgl/pipes/TextPipe.js';
import { TextField } from '../src/blakron/text/TextField.js';
import type { CanvasRenderer } from '../src/blakron/player/canvas/index.js';
import type { RenderBuffer } from '../src/blakron/player/canvas/index.js';

// Minimal stand-in for a WebGLTexture — the pipe never inspects its shape.
function mockTexture(): WebGLTexture {
	return {} as WebGLTexture;
}

function mockGl(): { deleteTexture: ReturnType<typeof vi.fn> } {
	return { deleteTexture: vi.fn() };
}

// Reach into TextPipe's private cache/token maps directly. There is no public
// API to seed a texture without a real WebGL context, and happy-dom doesn't
// implement one, so this mirrors the `as unknown as {...}` pattern already
// used in InstructionSet.test.ts for whitebox access.
interface TextPipeInternals {
	_cache: WeakMap<TextField, { texture: WebGLTexture | undefined; renderBuffer: RenderBuffer }>;
	_registryTokens: WeakMap<TextField, object>;
	// Untyped on purpose: real code assigns a `GL` instance, tests assign a
	// vi.fn()-based mock. Both only need to support `.deleteTexture(texture)`.
	_gl: unknown;
}

function internals(pipe: TextPipe): TextPipeInternals {
	return pipe as unknown as TextPipeInternals;
}

function seedCache(pipe: TextPipe, tf: TextField, texture: WebGLTexture | undefined): void {
	internals(pipe)._cache.set(tf, {
		texture,
		renderBuffer: {} as RenderBuffer,
	});
}

describe('TextPipe', () => {
	it('destroyRenderable deletes the cached GPU texture', () => {
		const pipe = new TextPipe({} as CanvasRenderer);
		const tf = new TextField();
		const texture = mockTexture();
		const gl = mockGl();

		internals(pipe)._gl = gl;
		seedCache(pipe, tf, texture);
		const token = {};
		internals(pipe)._registryTokens.set(tf, token);

		pipe.destroyRenderable(tf);

		expect(gl.deleteTexture).toHaveBeenCalledWith(texture);
		expect(internals(pipe)._registryTokens.get(tf)).toBeUndefined();
	});

	it('destroyRenderable removes the cache entry so a later lookup misses', () => {
		const pipe = new TextPipe({} as CanvasRenderer);
		const tf = new TextField();
		seedCache(pipe, tf, mockTexture());
		internals(pipe)._gl = mockGl();

		pipe.destroyRenderable(tf);

		// WeakMap has no public "has" check via get() returning undefined.
		expect(internals(pipe)._cache.get(tf)).toBeUndefined();
	});

	it('destroyRenderable on a TextField with no cache entry is a no-op', () => {
		const pipe = new TextPipe({} as CanvasRenderer);
		const tf = new TextField();
		const gl = mockGl();
		internals(pipe)._gl = gl;

		expect(() => pipe.destroyRenderable(tf)).not.toThrow();
		expect(gl.deleteTexture).not.toHaveBeenCalled();
	});

	it('destroyRenderable on a cache entry with no texture yet does not call deleteTexture', () => {
		const pipe = new TextPipe({} as CanvasRenderer);
		const tf = new TextField();
		const gl = mockGl();
		internals(pipe)._gl = gl;
		seedCache(pipe, tf, undefined);

		pipe.destroyRenderable(tf);

		expect(gl.deleteTexture).not.toHaveBeenCalled();
	});

	it('destroyRenderable without a cached GL context does not throw', () => {
		// execute() hasn't run yet, so _gl is still undefined — destroyRenderable
		// must not crash trying to call deleteTexture on it.
		const pipe = new TextPipe({} as CanvasRenderer);
		const tf = new TextField();
		seedCache(pipe, tf, mockTexture());

		expect(() => pipe.destroyRenderable(tf)).not.toThrow();
		expect(internals(pipe)._cache.get(tf)).toBeUndefined();
	});
});
