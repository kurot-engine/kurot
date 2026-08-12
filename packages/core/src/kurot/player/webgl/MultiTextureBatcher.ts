import type { Filter } from '../../filters/Filter.js';

// ── MultiTextureDrawCmd ───────────────────────────────────────────────────────

/**
 * A draw command that references a multi-texture batch.
 */
export interface MultiTextureDrawCmd {
	readonly isMulti: true;
	count: number;
	readonly textures: WebGLTexture[];
	textureCount: number;
	filter: Filter | undefined;
}

export function makeMultiCmd(
	count: number,
	slots: (WebGLTexture | undefined)[],
	slotCount: number,
): MultiTextureDrawCmd {
	return {
		isMulti: true,
		count,
		textures: slots.slice(0, slotCount) as WebGLTexture[],
		textureCount: slotCount,
		filter: undefined,
	};
}

// ── MultiTextureBatcher ───────────────────────────────────────────────────────

/**
 * Manages texture slot allocation for multi-texture batching.
 *
 * Inspired by Pixi.js 8's Batcher: instead of breaking a batch every time
 * the texture changes, we assign each unique texture a slot (0–7) and pack
 * all quads into a single draw call. When all slots are occupied we flush.
 *
 * Limitations:
 * - Only plain (no-filter) texture draws can be batched.
 * - Filters, masks, blend-mode changes, and mesh draws always break the batch.
 * - Maximum 8 textures per batch (WebGL1 minimum guaranteed texture units).
 */
export class MultiTextureBatcher {
	// ── Static fields ─────────────────────────────────────────────────────────
	public static readonly MAX_TEXTURES = 8;

	// ── Instance fields ───────────────────────────────────────────────────────
	public readonly slots: (WebGLTexture | undefined)[] = new Array(MultiTextureBatcher.MAX_TEXTURES).fill(undefined);
	private _slotCount = 0;
	private readonly _slotMap = new Map<WebGLTexture, number>();

	// ── Getters ───────────────────────────────────────────────────────────────

	public get textureCount(): number {
		return this._slotCount;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Assign a slot to `texture`. Returns the slot index (0–7).
	 * Returns -1 if all slots are full — caller must flush first.
	 */
	public getOrAssignSlot(texture: WebGLTexture): number {
		const existing = this._slotMap.get(texture);
		if (existing !== undefined) {
			return existing;
		}
		if (this._slotCount >= MultiTextureBatcher.MAX_TEXTURES) {
			return -1;
		}
		const slot = this._slotCount++;
		this.slots[slot] = texture;
		this._slotMap.set(texture, slot);
		return slot;
	}

	public isFull(): boolean {
		return this._slotCount >= MultiTextureBatcher.MAX_TEXTURES;
	}

	public reset(): void {
		for (let i = 0; i < this._slotCount; i++) {
			this.slots[i] = undefined;
		}
		this._slotCount = 0;
		this._slotMap.clear();
	}
}
