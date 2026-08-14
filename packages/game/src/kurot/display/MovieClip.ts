import { Bitmap } from '@kurot/core';
import type { MovieClipData } from './MovieClipData.js';
import { MovieClipEvent } from './types.js';

function _validatePlayTimes(value: number): number {
	if (!Number.isInteger(value) || value < -1) {
		throw new RangeError('MovieClip playTimes must be -1, 0, or a positive integer.');
	}
	return value;
}

/**
 * Sequence-frame animation display object.
 *
 * Frame numbers are 1-based. The owning game loop decides when to call
 * advanceFrame(), keeping frame-rate scheduling outside the display object.
 */
export class MovieClip extends Bitmap {
	// ── Instance fields ───────────────────────────────────────────────────────

	private _data?: MovieClipData;
	private _currentFrameIndex = 0;
	private _isPlaying = false;
	private _playTimes = 1;
	private _playedTimes = 0;
	private _playRangeStart = 0;
	private _playRangeEnd?: number;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(data?: MovieClipData) {
		super();
		if (data) {
			this.movieClipData = data;
		}
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	public get movieClipData(): MovieClipData | undefined {
		return this._data;
	}

	/**
	 * Set the frame data source and reset the clip to its first frame.
	 * Any active playback is stopped before the source is replaced.
	 */
	public set movieClipData(value: MovieClipData | undefined) {
		this.stop();
		this._data = value;
		this._currentFrameIndex = 0;
		this._playedTimes = 0;
		this._clearPlayRange();
		this._applyFrame(0);
	}

	/**
	 * Current frame number, 1-based.
	 */
	public get currentFrame(): number {
		return this._currentFrameIndex + 1;
	}

	/**
	 * Total number of frames.
	 */
	public get totalFrames(): number {
		return this._data?.frameCount ?? 0;
	}

	/**
	 * Whether the animation is currently playing.
	 */
	public get isPlaying(): boolean {
		return this._isPlaying;
	}

	/**
	 * Label that begins at the current frame, or undefined when there is none.
	 */
	public get currentFrameLabel(): string | undefined {
		return this._data?.getFrameLabel(this._currentFrameIndex);
	}

	/**
	 * Nearest preceding label for the current frame, or undefined when absent.
	 */
	public get currentLabel(): string | undefined {
		return this._data?.getFrameLabelForFrame(this._currentFrameIndex);
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Start or resume playback from the current frame.
	 *
	 * Calling play does not schedule updates. The owning game loop must call
	 * advanceFrame() whenever this clip should enter its next animation frame.
	 *
	 * @param playTimes -1 loops forever; 0 keeps the current setting; a positive
	 * integer plays that many times.
	 */
	public play(playTimes = 0): void {
		_validatePlayTimes(playTimes);
		if (this._isPlaying || !this._data || this._data.frameCount === 0) return;

		if (playTimes !== 0) {
			this._playTimes = playTimes;
		}
		this._playedTimes = 0;
		this._isPlaying = true;
	}

	/**
	 * Advance to the next animation frame.
	 *
	 * This is the external playback entry point. It advances exactly one frame,
	 * performs loop/completion handling, and dispatches frame events. It does
	 * nothing while stopped.
	 */
	public advanceFrame(): void {
		if (!this._isPlaying) return;

		const data = this._data;
		if (!data || data.frameCount === 0) {
			this.stop();
			return;
		}

		const rangeEnd = this._playRangeEnd ?? data.frameCount - 1;
		const nextIndex = this._currentFrameIndex + 1;
		if (nextIndex <= rangeEnd) {
			this._currentFrameIndex = nextIndex;
			this._applyFrame(nextIndex);
			return;
		}

		this._playedTimes++;
		if (this._playTimes !== -1 && this._playedTimes >= this._playTimes) {
			this.stop();
			this.dispatchEventWith(MovieClipEvent.COMPLETE);
			return;
		}

		this.dispatchEventWith(MovieClipEvent.LOOP_COMPLETE);
		if (!this._isPlaying || this._data !== data) return;
		this._currentFrameIndex = this._playRangeEnd === undefined ? 0 : this._playRangeStart;
		this._applyFrame(this._currentFrameIndex);
	}

	/**
	 * Stop playback and stay on the current frame.
	 */
	public stop(): void {
		this._isPlaying = false;
	}

	/**
	 * Move to the previous frame and stop.
	 */
	public prevFrame(): void {
		this.gotoAndStop(this.currentFrame - 1);
	}

	/**
	 * Move to the next frame and stop.
	 *
	 * This is manual navigation. Playback loops should use advanceFrame().
	 */
	public nextFrame(): void {
		this.gotoAndStop(this.currentFrame + 1);
	}

	/**
	 * Jump to a frame or label and start a new playback session.
	 *
	 * A label plays only its declared inclusive frame range. A numeric frame
	 * clears any active label range and plays through the full animation.
	 *
	 * @param frame 1-based frame number or a frame label string.
	 * @param playTimes -1 loops forever; 0 keeps the current setting; a positive
	 * integer plays that many times.
	 */
	public gotoAndPlay(frame: number | string, playTimes = 0): void {
		_validatePlayTimes(playTimes);
		const target = this._resolveFrame(frame);
		if (!target) {
			this.stop();
			return;
		}

		this.stop();
		this._setPlayRange(target.rangeStart, target.rangeEnd);
		this._setCurrentFrame(target.index);
		this.play(playTimes);
	}

	/**
	 * Jump to a frame or label and stop.
	 * @param frame 1-based frame number or a frame label string.
	 */
	public gotoAndStop(frame: number | string): void {
		const target = this._resolveFrame(frame);
		if (!target) return;

		this.stop();
		this._clearPlayRange();
		this._setCurrentFrame(target.index);
	}

	// ── Override methods ──────────────────────────────────────────────────────

	public override $onRemoveFromStage(): void {
		super.$onRemoveFromStage();
		this.stop();
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private _resolveFrame(
		frame: number | string,
	): { index: number; rangeStart: number; rangeEnd: number | undefined } | undefined {
		const data = this._data;
		if (!data || data.frameCount === 0) return undefined;

		if (typeof frame === 'string') {
			const range = data.getFrameLabelRange(frame);
			if (!range) {
				throw new RangeError(`MovieClip label does not exist: ${frame}`);
			}
			return { index: range.startFrame, rangeStart: range.startFrame, rangeEnd: range.endFrame };
		}

		if (!Number.isInteger(frame)) {
			throw new RangeError('MovieClip frame number must be a finite integer.');
		}
		return {
			index: Math.max(0, Math.min(frame - 1, data.frameCount - 1)),
			rangeStart: 0,
			rangeEnd: undefined,
		};
	}

	private _setCurrentFrame(index: number): void {
		this._currentFrameIndex = index;
		this._applyFrame(index);
	}

	private _setPlayRange(startFrame: number, endFrame: number | undefined): void {
		this._playRangeStart = startFrame;
		this._playRangeEnd = endFrame;
	}

	private _clearPlayRange(): void {
		this._setPlayRange(0, undefined);
	}

	private _applyFrame(index: number): void {
		const frame = this._data?.getFrame(index);
		this.texture = frame?.texture;
		if (!frame) return;

		this.dispatchEventWith(MovieClipEvent.FRAME_CHANGE);
		if (frame.event) {
			this.dispatchEventWith(frame.event);
		}
	}
}
