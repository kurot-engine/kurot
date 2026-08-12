import { Texture, TextureFilter, TextureWrap } from '@esotericsoftware/spine-core';
import type { BitmapData } from '@kurot/core';

/**
 * Wraps a Kurot `BitmapData` as a `spine.Texture` so the Spine runtime
 * can reference it when building `TextureAtlas` pages.
 */
export class KurotTexture extends Texture {
	// ── Instance fields ───────────────────────────────────────────────────────

	public smoothing = false;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(public readonly bitmapData: BitmapData) {
		super(bitmapData.source as HTMLImageElement);
	}

	// ── Overrides ─────────────────────────────────────────────────────────────

	public override getImage(): HTMLImageElement | ImageBitmap {
		return this.bitmapData.source as HTMLImageElement;
	}

	public override setFilters(minFilter: TextureFilter, magFilter: TextureFilter): void {
		const { Nearest, MipMapNearestNearest } = TextureFilter;
		this.smoothing =
			(minFilter !== Nearest && minFilter !== MipMapNearestNearest) ||
			(magFilter !== Nearest && magFilter !== MipMapNearestNearest);
	}

	public override setWraps(_uWrap: TextureWrap, _vWrap: TextureWrap): void {
		// no-op for Canvas 2D; WebGL wrap hints can be stored here if needed
	}

	public override dispose(): void {
		this.bitmapData.dispose();
	}
}
