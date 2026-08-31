import type { BitmapData } from '../display/texture/BitmapData.js';
import type { Filter } from '../filters/Filter.js';

/**
 * Opaque texture handle passed between render pipes and their context.
 */
export type TextureHandle = unknown;

/**
 * Opaque offscreen buffer handle passed through a render context.
 */
export type OffscreenBufferHandle = unknown;

/**
 * Drawing surface contract consumed by render pipes.
 */
export interface RenderContext {
	/** Increments whenever backend GPU resources must be recreated. */
	readonly contextVersion: number;

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

	createTexture(
		source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
		sourcePremultipliedAlpha?: boolean,
	): TextureHandle;

	updateTexture(
		texture: TextureHandle,
		source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
		sourcePremultipliedAlpha?: boolean,
	): void;

	/**
	 * Registers `texture` for backend-appropriate cleanup once `owner` is
	 * garbage-collected, keyed by `token` so a later `unregisterTextureGC`
	 * call can cancel this specific registration (e.g. when `owner`'s cached
	 * texture is replaced before it was ever collected). Replaces a pipe
	 * holding onto a raw GPU context handle itself just to delete a texture
	 * later — pipes never need to know which backend created the texture.
	 */
	registerTextureForGC(owner: object, texture: TextureHandle, token: object): void;

	/**
	 * Cancels a pending registration made via `registerTextureForGC`.
	 */
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

	/**
	 * Maximum texture dimension the backend can handle (e.g. `MAX_TEXTURE_SIZE` in WebGL).
	 */
	maxTextureSize: number;
}
