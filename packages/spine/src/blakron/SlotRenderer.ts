import {
	BlendMode as SpineBlendMode,
	ClippingAttachment,
	Color,
	MeshAttachment,
	RegionAttachment,
	type Slot,
	type SlotPose,
	type SkeletonClipping,
	type TextureAtlasRegion,
} from '@esotericsoftware/spine-core';
import { Mesh, Texture, BitmapData, BlendMode } from '@blakron/core';
import type { BlakronTexture } from './BlakronTexture.js';

const QUAD_INDICES = [0, 1, 2, 2, 3, 0];

/**
 * A Blakron `Mesh` subclass that renders a single Spine slot each frame.
 * One `SlotRenderer` is created per slot by `SkeletonRenderer`.
 */
export class SlotRenderer extends Mesh {
	// ── Instance fields ───────────────────────────────────────────────────────

	private _finalColor = new Color();
	private _worldVertices: Float32Array = new Float32Array(8);

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(
		public readonly slot: Slot,
		public readonly clipper: SkeletonClipping,
	) {
		super();
		this.name = slot.data.name;

		if (slot.data.blendMode === SpineBlendMode.Additive) {
			this.blendMode = BlendMode.ADD;
		}
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Update mesh geometry from the current slot attachment.
	 * Called every frame by `SkeletonRenderer.update()`.
	 */
	public renderSlot(): void {
		const pose = this.slot.appliedPose;
		const attachment = pose.attachment;

		if (!this.slot.bone.active || !attachment) {
			this.clipper.clipEnd(this.slot);
			this.visible = false;
			return;
		}

		this.visible = true;

		if (attachment instanceof ClippingAttachment) {
			this.clipper.clipStart(this.slot.skeleton, this.slot, attachment);
			return;
		}

		if (attachment instanceof RegionAttachment) {
			this._updateColor(attachment.color);
			this._renderRegion(attachment, pose);
		} else if (attachment instanceof MeshAttachment) {
			this._updateColor(attachment.color);
			this._renderMesh(attachment, pose);
		}

		this.clipper.clipEnd(this.slot);
		this.updateVertices();
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private _renderRegion(attachment: RegionAttachment, pose: SlotPose): void {
		const numFloats = 8; // 4 vertices × 2 floats
		this._ensureWorldVertices(numFloats);
		attachment.computeWorldVertices(this.slot, attachment.getOffsets(pose), this._worldVertices, 0, 2);

		const sequence = attachment.sequence;
		const sequenceIndex = sequence.resolveIndex(pose);
		const uvs = sequence.getUVs(sequenceIndex);

		if (this.clipper.isClipping()) {
			this.clipper.clipTrianglesUnpacked(this._worldVertices, 0, QUAD_INDICES, QUAD_INDICES.length, uvs, 2);
			this._applyClipped();
		} else {
			this.vertices = Array.from(this._worldVertices.subarray(0, numFloats));
			this.uvs = Array.from(uvs.subarray(0, numFloats));
			this.indices = QUAD_INDICES.slice();
		}

		this._applyTexture(sequence.regions[sequenceIndex] as TextureAtlasRegion | null);
	}

	private _renderMesh(attachment: MeshAttachment, pose: SlotPose): void {
		const numFloats = attachment.worldVerticesLength;
		this._ensureWorldVertices(numFloats);
		attachment.computeWorldVertices(this.slot.skeleton, this.slot, 0, numFloats, this._worldVertices, 0, 2);

		const sequence = attachment.sequence;
		const sequenceIndex = sequence.resolveIndex(pose);
		const uvs = sequence.getUVs(sequenceIndex);

		if (this.clipper.isClipping()) {
			this.clipper.clipTrianglesUnpacked(
				this._worldVertices,
				0,
				attachment.triangles,
				attachment.triangles.length,
				uvs,
				2,
			);
			this._applyClipped();
		} else {
			this.vertices = Array.from(this._worldVertices.subarray(0, numFloats));
			this.uvs = Array.from(uvs.subarray(0, numFloats));
			this.indices = Array.from(attachment.triangles);
		}

		this._applyTexture(sequence.regions[sequenceIndex] as TextureAtlasRegion | null);
	}

	private _applyClipped(): void {
		this.vertices = Array.from(this.clipper.clippedVerticesTyped);
		this.uvs = Array.from(this.clipper.clippedUVsTyped);
		this.indices = Array.from(this.clipper.clippedTrianglesTyped);
	}

	private _applyTexture(region: TextureAtlasRegion | null): void {
		const blakronTexture = region?.page?.texture as BlakronTexture | undefined;
		if (!blakronTexture?.bitmapData) return;

		const bd = blakronTexture.bitmapData;
		if (!this.texture || (this.texture as Texture).bitmapData !== bd) {
			const t = new Texture();
			t.setBitmapData(bd as BitmapData);
			this.texture = t;
			this.smoothing = blakronTexture.smoothing;
		}
	}

	private _updateColor(attachmentColor: Color): void {
		const pose = this.slot.appliedPose;
		const skel = this.slot.skeleton;
		const fc = this._finalColor;
		fc.r = skel.color.r * pose.color.r * attachmentColor.r;
		fc.g = skel.color.g * pose.color.g * attachmentColor.g;
		fc.b = skel.color.b * pose.color.b * attachmentColor.b;
		fc.a = skel.color.a * pose.color.a * attachmentColor.a;

		this.tint = ((fc.r * 255) << 16) | ((fc.g * 255) << 8) | ((fc.b * 255) | 0);
		this.alpha = fc.a;
	}

	private _ensureWorldVertices(count: number): void {
		if (this._worldVertices.length < count) {
			this._worldVertices = new Float32Array(count);
		}
	}
}
