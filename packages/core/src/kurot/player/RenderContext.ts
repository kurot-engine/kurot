import type { BitmapData } from '../display/texture/BitmapData.js';
import type { Filter } from '../filters/Filter.js';

/**
 * Opaque backend texture handle.
 *
 * Its concrete type is backend-specific (`WebGLTexture` today, `GPUTexture` in
 * a future WebGPU backend). Pipes only ever receive this from `RenderContext`
 * methods and pass it back to other `RenderContext` methods — they never
 * inspect its internals. Aliased to `unknown` (not a branded type) because the
 * WebGL backend returns the native `WebGLTexture` directly, which couldn't
 * satisfy a branded interface without a wrapping class. The alias exists for
 * readability and documentation, not type-level enforcement.
 */
export type TextureHandle = unknown;

/**
 * Opaque offscreen buffer handle (`WebGLRenderBuffer` today). Same rationale
 * as {@link TextureHandle} — pass-through only, aliased to `unknown`.
 */
export type OffscreenBufferHandle = unknown;

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
 * produced this list. `texture`/`buffer` parameters are typed
 * {@link TextureHandle}/{@link OffscreenBufferHandle} because their concrete
 * shape (`WebGLTexture`, `WebGLRenderBuffer`, ...) is backend-specific; pipes
 * only ever pass through values they received from this same interface, never
 * inspect their internals directly.
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
		texture: TextureHandle,
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
		texture: TextureHandle,
		sourceWidth: number,
		sourceHeight: number,
		destX: number,
		destY: number,
		destWidth: number,
		destHeight: number,
	): void;

	compositeFilterResult(filters: Filter[], offscreen: OffscreenBufferHandle): void;

	// ── Texture upload ──────────────────────────────────────────────────────

	createTexture(source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): TextureHandle;

	updateTexture(texture: TextureHandle, source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): void;

	/**
	 * Registers `texture` for backend-appropriate cleanup once `owner` is
	 * garbage-collected, keyed by `token` so a later `unregisterTextureGC`
	 * call can cancel this specific registration (e.g. when `owner`'s cached
	 * texture is replaced before it was ever collected). Replaces a pipe
	 * holding onto a raw GPU context handle itself just to delete a texture
	 * later — pipes never need to know which backend created the texture.
	 */
	registerTextureForGC(owner: object, texture: TextureHandle, token: object): void;

	/** Cancels a pending registration made via `registerTextureForGC`. */
	unregisterTextureGC(token: object): void;

	/**
	 * Immediately release a texture previously passed to
	 * `registerTextureForGC`, without waiting for garbage collection.
	 */
	deleteTexture(texture: TextureHandle): void;

	// ── Mask / scissor ──────────────────────────────────────────────────────

	pushMask(x: number, y: number, width: number, height: number): void;
	popMask(): void;
	enableScissor(x: number, y: number, width: number, height: number): void;
	disableScissor(): void;

	// ── Offscreen buffer stack ─────────────────────────────────────────────

	pushBuffer(buffer: OffscreenBufferHandle): void;
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
