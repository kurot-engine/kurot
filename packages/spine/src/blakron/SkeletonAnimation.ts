import {
	AnimationState,
	AnimationStateData,
	Skeleton,
	type SkeletonData as SpineSkeletonData,
} from '@esotericsoftware/spine-core';
import { Sprite, Event } from '@kurot/core';
import type { Stage } from '@kurot/core';
import { SkeletonRenderer } from './SkeletonRenderer.js';
import { Track } from './Track.js';
import type { AnimationListener } from './Track.js';

// The main public-facing display object for Spine animations.
//
// Implementation notes:
//   - extends Sprite from @kurot/core
//   - Constructor receives a spine.SkeletonData:
//       1. Create a SkeletonRenderer and addChild()
//       2. Expose renderer.state / stateData / skeleton / skeletonData as readonly
//   - Lifecycle:
//       - $onAddToStage(): record lastTime, register ENTER_FRAME listener
//       - $onRemoveFromStage(): remove ENTER_FRAME listener
//       - ENTER_FRAME handler: renderer.update(now - lastTime); lastTime = now
//   - flipX / flipY: set renderer.scaleX / scaleY (Spine Y is already inverted in renderer)
//   - setTimeScale(scale): state.timeScale = scale
//   - setMix(mixTime, fromAnim?, toAnim?): stateData.setMix() or defaultMix
//   - getAllSkinNames(): skeletonData.skins.map(s => s.name)
//   - setSkinByName(name): skeleton.setSkin(); skeleton.setupPose()
//   - play(anim, loop, trackID, listener): start(trackID).add(anim, loop, listener)
//   - start(trackID): skeleton.setupPose(); return new Track(this, trackID)
//   - stop(track): state.clearTrack(track)
//   - stopAll(reset?): state.clearTracks(); if reset: skeleton.setupPose()

export class SkeletonAnimation extends Sprite {
	public readonly renderer: SkeletonRenderer;

	private _lastTime = 0;

	public constructor(skeletonData: SpineSkeletonData) {
		super();
		this.renderer = new SkeletonRenderer(skeletonData);
		this.addChild(this.renderer);
	}

	// ── Getters ───────────────────────────────────────────────────────────────

	public get skeleton(): Skeleton {
		return this.renderer.skeleton;
	}
	public get skeletonData(): SpineSkeletonData {
		return this.renderer.skeletonData;
	}
	public get state(): AnimationState {
		return this.renderer.state;
	}
	public get stateData(): AnimationStateData {
		return this.renderer.stateData;
	}

	// ── Flip ──────────────────────────────────────────────────────────────────

	public get flipX(): boolean {
		return this.renderer.scaleX === -1;
	}
	public set flipX(v: boolean) {
		this.renderer.scaleX = v ? -1 : 1;
	}

	public get flipY(): boolean {
		return this.renderer.scaleY === 1;
	}
	public set flipY(v: boolean) {
		this.renderer.scaleY = v ? 1 : -1;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Set the global time scale for all animations on this skeleton.
	 */
	public setTimeScale(scale: number): void {
		this.state.timeScale = scale;
	}

	/**
	 * Set the cross-fade mix time between two animations.
	 * Omit both names to set the default mix for all transitions.
	 */
	public setMix(mixTime: number, fromAnim?: string, toAnim?: string): void {
		if (fromAnim && toAnim) {
			this.stateData.setMix(fromAnim, toAnim, mixTime);
		} else {
			this.stateData.defaultMix = mixTime;
		}
	}

	/**
	 * Return all skin names defined in the skeleton data.
	 */
	public getAllSkinNames(): string[] {
		return this.skeletonData.skins.map(s => s.name);
	}

	/**
	 * Switch to the named skin and reset the skeleton to its setup pose.
	 */
	public setSkinByName(name: string): void {
		this.skeleton.setSkin(name);
		this.skeleton.setupPose();
	}

	/**
	 * Play a single animation.
	 * @param anim Animation name.
	 * @param loop Number of times to play. 0 = loop forever.
	 * @param trackID Spine track index (default 0).
	 * @param listener Optional lifecycle callbacks.
	 */
	public play(anim: string, loop = 0, trackID = 0, listener?: AnimationListener): Track {
		return this.start(trackID).add(anim, loop, listener);
	}

	/**
	 * Play the first animation in the skeleton data, or a named one.
	 */
	public playDefault(anim?: string, loop = 0, trackID = 0, listener?: AnimationListener): Track {
		const name = anim ?? this.skeletonData.animations[0].name;
		return this.start(trackID).add(name, loop, listener);
	}

	/**
	 * Queue a list of animations on the given track.
	 */
	public playList(animList: string[], loop = 0, trackID = 0): Track {
		const track = this.start(trackID);
		for (const anim of animList) {
			track.add(anim, loop);
		}
		return track;
	}

	/**
	 * Queue all animations defined in the skeleton data.
	 */
	public playAll(loop = 0, trackID = 0): Track {
		const track = this.start(trackID);
		for (const anim of this.skeletonData.animations) {
			track.add(anim.name, loop);
		}
		return track;
	}

	/**
	 * Play a randomly chosen animation.
	 */
	public playRandom(trackID = 0): Track {
		const names = this.skeletonData.animations.map(a => a.name);
		const name = names[Math.floor(Math.random() * names.length)];
		return this.start(trackID).add(name, 0);
	}

	/**
	 * Reset the skeleton to its setup pose and return a new Track for the given track ID.
	 */
	public start(trackID = 0): Track {
		this.skeleton.setupPose();
		return new Track(this, trackID);
	}

	/**
	 * Clear a single animation track.
	 */
	public stop(trackID: number): void {
		this.state.clearTrack(trackID);
	}

	/**
	 * Clear all animation tracks.
	 * @param reset If true, also resets the skeleton to its setup pose.
	 */
	public stopAll(reset?: boolean): void {
		this.state.clearTracks();
		if (reset) this.skeleton.setupPose();
	}

	// ── Override methods ──────────────────────────────────────────────────────

	public override $onAddToStage(stage: Stage, $nestLevel: number): void {
		super.$onAddToStage(stage, $nestLevel);
		this._lastTime = Date.now();
		this.addEventListener(Event.ENTER_FRAME, this._handleEnterFrame);
	}

	public override $onRemoveFromStage(): void {
		super.$onRemoveFromStage();
		this.removeEventListener(Event.ENTER_FRAME, this._handleEnterFrame);
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private _handleEnterFrame = (_e: Event): void => {
		const now = Date.now();
		this.renderer.update(now - this._lastTime);
		this._lastTime = now;
	};
}

// Suppress unused import warning until implementation is complete
void Track;
