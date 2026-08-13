import type { BitmapData } from '../display/texture/BitmapData.js';
import type { Filter } from '../filters/Filter.js';

/**
 * Backend-agnostic drawing surface used by leaf/effect pipes.
 *
 * This is the one coupling point between a pipe's `execute()` body and a
 * concrete GPU API. `WebGLRenderContext` implements this interface today;
 * a future WebGPU backend would provide its own implementation without any
 * change to the pipes that consume it.
 *
 * Only methods actually called from `player/pipes/*.ts` are declared here —
 * see docs-internal/renderer-backend-decoupling.md for the grep that
 * produced this list. `texture`/`buffer` parameters are typed `unknown`
 * because their concrete shape (`WebGLTexture`, `WebGLRenderBuffer`, ...) is
 * backend-specific; pipes only ever pass through values they received from
 * this same interface, never inspect their internals directly.
 */
export interface RenderContext {
	// ── Draw ────────────────────────────────────────────────────────────────

	drawImage(
		image: BitmapData,
		sourceX: number,
		sourceY: number,
		sourceWidth: number,
		sourceHeight: number,
		destX: number,
		destY: number,
		destWidth: number,
		destHeight: number,
		imageSourceWidth: number,
		imageSourceHeight: number,
		rotated: boolean,
		smoothing?: boolean,
	): void;

	drawMesh(
		image: BitmapData,
		sourceX: number,
		sourceY: number,
		sourceWidth: number,
		sourceHeight: number,
		destX: number,
		destY: number,
		destWidth: number,
		destHeight: number,
		imageSourceWidth: number,
		imageSourceHeight: number,
		meshUVs: number[],
		meshVertices: number[],
		meshIndices: number[],
		rotated: boolean,
		smoothing: boolean,
	): void;

	drawTexture(
		texture: unknown,
		sourceX: number,
		sourceY: number,
		sourceWidth: number,
		sourceHeight: number,
		destX: number,
		destY: number,
		destWidth: number,
		destHeight: number,
		textureWidth: number,
		textureHeight: number,
	): void;

	drawFramebufferTexture(
		texture: unknown,
		sourceWidth: number,
		sourceHeight: number,
		destX: number,
		destY: number,
		destWidth: number,
		destHeight: number,
	): void;

	compositeFilterResult(filters: Filter[], offscreen: unknown): void;

	// ── Texture upload ──────────────────────────────────────────────────────

	createTexture(source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): unknown;

	updateTexture(texture: unknown, source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): void;

	/**
	 * Registers `texture` for backend-appropriate cleanup once `owner` is
	 * garbage-collected, keyed by `token` so a later `unregisterTextureGC`
	 * call can cancel this specific registration (e.g. when `owner`'s cached
	 * texture is replaced before it was ever collected). Replaces a pipe
	 * holding onto a raw GPU context handle itself just to delete a texture
	 * later — pipes never need to know which backend created the texture.
	 */
	registerTextureForGC(owner: object, texture: unknown, token: object): void;

	/** Cancels a pending registration made via `registerTextureForGC`. */
	unregisterTextureGC(token: object): void;

	/**
	 * Immediately release a texture previously passed to
	 * `registerTextureForGC`, without waiting for garbage collection.
	 */
	deleteTexture(texture: unknown): void;

	// ── Mask / scissor ──────────────────────────────────────────────────────

	pushMask(x: number, y: number, width: number, height: number): void;
	popMask(): void;
	enableScissor(x: number, y: number, width: number, height: number): void;
	disableScissor(): void;

	// ── Offscreen buffer stack ─────────────────────────────────────────────

	pushBuffer(buffer: unknown): void;
	popBuffer(): void;

	// ── Blend mode ──────────────────────────────────────────────────────────

	setGlobalCompositeOperation(value: string): void;
	currentBlendMode: string;

	// ── Filter ──────────────────────────────────────────────────────────────

	activeFilter?: Filter;

	// ── Frame lifecycle ─────────────────────────────────────────────────────

	flush(): void;

	// ── Limits ──────────────────────────────────────────────────────────────

	/** Maximum texture dimension the backend can handle (e.g. `MAX_TEXTURE_SIZE` in WebGL). */
	maxTextureSize: number;
}
