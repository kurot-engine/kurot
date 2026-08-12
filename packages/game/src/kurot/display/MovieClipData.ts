import type { Texture } from '@kurot/core';
import type { MovieClipFrame, MovieClipLabel } from './types.js';

function _validatePositiveFinite(value: number, name: string): number {
	if (!Number.isFinite(value) || value <= 0) {
		throw new RangeError(`${name} must be a finite positive number.`);
	}
	return value;
}

function _validateFrameIndex(value: number, frameCount: number, name: string): number {
	if (!Number.isInteger(value) || value < 0 || value >= frameCount) {
		throw new RangeError(`${name} is out of range.`);
	}
	return value;
}

function _validateLabelName(value: string): string {
	if (typeof value !== 'string' || value.trim().length === 0) {
		throw new RangeError('MovieClip label name must not be empty.');
	}
	return value;
}

/**
 * Holds format-agnostic frame data for a MovieClip animation.
 *
 * MovieClip reads the frame sequence, labels, and events from this object. The
 * owning animation scheduler may use frameRate and per-frame duration metadata
 * when deciding when to call MovieClip.advanceFrame().
 */
export class MovieClipData {
	// ── Instance fields ───────────────────────────────────────────────────────

	private _frames: MovieClipFrame[] = [];
	private _labels: MovieClipLabel[] = [];
	private _labelMap = new Map<string, MovieClipLabel>();
	private _frameRate = 24;

	// ── Getters / Setters ─────────────────────────────────────────────────────

	/**
	 * Fixed-rate timing metadata used by factories and external schedulers.
	 */
	public get frameRate(): number {
		return this._frameRate;
	}

	public set frameRate(value: number) {
		this._frameRate = _validatePositiveFinite(value, 'MovieClipData frameRate');
	}

	/**
	 * Total number of frames.
	 */
	public get frameCount(): number {
		return this._frames.length;
	}

	/**
	 * Sum of frame-duration metadata in milliseconds.
	 */
	public get totalDuration(): number {
		let total = 0;
		for (const frame of this._frames) {
			total += frame.duration;
		}
		return total;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Append a frame to the animation.
	 * @param texture Texture to display; undefined creates a blank frame.
	 * @param duration Timing metadata in milliseconds for an external scheduler.
	 * @param label Optional label beginning at this 0-based frame index.
	 */
	public addFrame(texture: Texture | undefined, duration: number, label?: string): void {
		const index = this._frames.length;
		this._frames.push({ texture, duration: _validatePositiveFinite(duration, 'MovieClip frame duration'), label });
		if (label) {
			this.setFrameLabel(label, index);
		}
	}

	/**
	 * Add or replace a named, inclusive playback range.
	 * @param name Label name.
	 * @param startFrame 0-based first frame in the range.
	 * @param endFrame 0-based final frame in the range; defaults to startFrame.
	 */
	public setFrameLabel(name: string, startFrame: number, endFrame: number = startFrame): void {
		_validateLabelName(name);
		_validateFrameIndex(startFrame, this._frames.length, 'MovieClip label start frame');
		_validateFrameIndex(endFrame, this._frames.length, 'MovieClip label end frame');
		if (endFrame < startFrame) {
			throw new RangeError('MovieClip label end frame must not precede its start frame.');
		}

		const existing = this._labelMap.get(name);
		if (existing) {
			existing.startFrame = startFrame;
			existing.endFrame = endFrame;
			return;
		}

		const label = { name, startFrame, endFrame };
		this._labels.push(label);
		this._labelMap.set(name, label);
	}

	/**
	 * Set a custom event name to dispatch when a specific frame becomes current.
	 */
	public setFrameEvent(frameIndex: number, eventName: string): void {
		_validateFrameIndex(frameIndex, this._frames.length, 'MovieClip frame index');
		if (typeof eventName !== 'string' || eventName.trim().length === 0) {
			throw new RangeError('MovieClip frame event name must not be empty.');
		}
		this._frames[frameIndex].event = eventName;
	}

	/**
	 * Get a frame by 0-based internal index.
	 */
	public getFrame(index: number): MovieClipFrame | undefined {
		return this._frames[index];
	}

	/**
	 * Get the inclusive range for a label, or undefined when it does not exist.
	 */
	public getFrameLabelRange(name: string): Readonly<MovieClipLabel> | undefined {
		return this._labelMap.get(name);
	}

	/**
	 * Get the label that begins exactly at a 0-based frame index.
	 */
	public getFrameLabel(frameIndex: number): string | undefined {
		return this._labels.find(label => label.startFrame === frameIndex)?.name;
	}

	/**
	 * Get the nearest preceding label at a 0-based frame index.
	 */
	public getFrameLabelForFrame(frameIndex: number): string | undefined {
		let nearest: MovieClipLabel | undefined;
		for (const label of this._labels) {
			if (label.startFrame <= frameIndex && (!nearest || label.startFrame > nearest.startFrame)) {
				nearest = label;
			}
		}
		return nearest?.name;
	}

	/**
	 * Get the 0-based first frame index for a given label, or -1 when absent.
	 */
	public getFrameByLabel(label: string): number {
		return this._labelMap.get(label)?.startFrame ?? -1;
	}

	// ── Static factories ──────────────────────────────────────────────────────

	/**
	 * Create fixed-rate frame data from an array of textures.
	 */
	public static fromTextureArray(textures: Texture[], fps = 12): MovieClipData {
		const frameRate = _validatePositiveFinite(fps, 'MovieClip factory fps');
		const data = new MovieClipData();
		data.frameRate = frameRate;
		const duration = 1000 / frameRate;
		for (const texture of textures) {
			data.addFrame(texture, duration);
		}
		return data;
	}

	/**
	 * Create fixed-rate frame data from a SpriteSheet and frame-name list.
	 */
	public static fromSpriteSheet(
		sheet: { getTexture(name: string): Texture | undefined },
		frameNames: string[],
		fps = 12,
	): MovieClipData {
		const frameRate = _validatePositiveFinite(fps, 'MovieClip factory fps');
		const data = new MovieClipData();
		data.frameRate = frameRate;
		const duration = 1000 / frameRate;
		for (const name of frameNames) {
			data.addFrame(sheet.getTexture(name), duration, name);
		}
		return data;
	}
}
