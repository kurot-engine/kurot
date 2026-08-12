// ── Blakron adapters ──────────────────────────────────────────────────────────
export { SkeletonAnimation } from './blakron/SkeletonAnimation.js';
export { SkeletonRenderer } from './blakron/SkeletonRenderer.js';
export { SlotRenderer } from './blakron/SlotRenderer.js';
export { BlakronTexture } from './blakron/BlakronTexture.js';
export { BlakronAssetManager } from './blakron/BlakronAssetManager.js';
export { Track, SpineEvent } from './blakron/Track.js';
export type { AnimationListener } from './blakron/Track.js';

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
