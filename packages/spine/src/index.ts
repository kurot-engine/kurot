// ── Kurot adapters ──────────────────────────────────────────────────────────
export { SkeletonAnimation } from './kurot/SkeletonAnimation.js';
export { SkeletonRenderer } from './kurot/SkeletonRenderer.js';
export { SlotRenderer } from './kurot/SlotRenderer.js';
export { KurotTexture } from './kurot/KurotTexture.js';
export { KurotAssetManager } from './kurot/KurotAssetManager.js';
export { Track, SpineEvent } from './kurot/Track.js';
export type { AnimationListener } from './kurot/Track.js';

// ── Spine core re-exports (commonly needed by consumers) ──────────────────────
export {
	Skeleton,
	SkeletonData,
	SkeletonJson,
	SkeletonBinary,
	AnimationState,
	AnimationStateData,
	TextureAtlas,
	AtlasAttachmentLoader,
	AssetManagerBase,
	Texture,
	TextureFilter,
	TextureWrap,
	MathUtils,
	Color,
} from '@esotericsoftware/spine-core';
