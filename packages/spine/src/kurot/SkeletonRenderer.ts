import {
	AnimationState,
	AnimationStateData,
	Physics,
	Skeleton,
	SkeletonClipping,
	SkeletonData,
} from '@esotericsoftware/spine-core';
import { Sprite } from '@kurot/core';
import { SlotRenderer } from './SlotRenderer.js';

/**
 * A Blakron `Sprite` container that holds one `SlotRenderer` (Mesh) per Spine slot.
 * Drives the animation state and updates all slot meshes each frame.
 */
export class SkeletonRenderer extends Sprite {
	// ── Instance fields ───────────────────────────────────────────────────────

	public readonly skeleton: Skeleton;
	public readonly skeletonData: SkeletonData;
	public readonly state: AnimationState;
	public readonly stateData: AnimationStateData;
	public readonly slotRenderers: SlotRenderer[] = [];
	public readonly clipper: SkeletonClipping = new SkeletonClipping();

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(skeletonData: SkeletonData) {
		super();
		this.skeletonData = skeletonData;
		this.stateData = new AnimationStateData(skeletonData);
		this.state = new AnimationState(this.stateData);
		this.skeleton = new Skeleton(skeletonData);

		// Spine Y-axis is inverted relative to screen coordinates
		this.scaleY = -1;
		// Draw order changes every frame — enable z-index sorting
		this.sortableChildren = true;

		this.skeleton.updateWorldTransform(Physics.update);
		this.skeleton.setupPoseSlots();

		for (const slot of this.skeleton.slots) {
			const renderer = new SlotRenderer(slot, this.clipper);
			renderer.renderSlot();
			this.addChild(renderer);
			this.slotRenderers.push(renderer);
		}
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Advance the animation state and update all slot meshes.
	 * @param dt Elapsed time in milliseconds.
	 */
	public update(dt: number): void {
		this.state.update(dt / 1000);
		this.state.apply(this.skeleton);
		this.skeleton.updateWorldTransform(Physics.update);

		const drawOrder = this.skeleton.drawOrder.appliedPose;
		for (let i = 0; i < drawOrder.length; i++) {
			const slotIndex = drawOrder[i].data.index;
			const renderer = this.slotRenderers[slotIndex];
			if (renderer.zIndex !== i) {
				renderer.zIndex = i;
			}
			renderer.renderSlot();
		}

		this.clipper.clipEnd();
	}

	/**
	 * Find a `SlotRenderer` by slot name.
	 */
	public findSlotRenderer(name: string): SlotRenderer | undefined {
		return this.slotRenderers.find(r => r.name === name);
	}
}
