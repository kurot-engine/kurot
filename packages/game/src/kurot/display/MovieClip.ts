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

	/**
	 * Borrowed animation data, initially undefined. Assigning data stops playback,
	 * resets the frame/range and displays the first frame. Neither replacement nor
	 * stage removal disposes shared frame textures or the external animation scheduler.
	 */
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
	 * Start or resume at the current frame. Does nothing if already playing or
	 * there are no frames. No updates are scheduled: the game calls advanceFrame().
	 * @param playTimes Total plays: -1 forever; 0 (default) preserves the previous
	 * setting, initially 1; positive integers set a new count.
	 * @throws RangeError If playTimes is not an integer of at least -1.
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
	 * Stop on the current frame without dispatching COMPLETE. Stage removal also
	 * stops playback. The game must detach its own scheduler/listeners separately;
	 * this method does not dispose borrowed frame data or textures.
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
	 * Jump to a frame/label and start a new session. Numeric frames use 1-based
	 * indices, clamped to the available range. Labels play their inclusive range;
	 * numeric navigation clears that range. With no frames, stops and returns.
	 * @param frame Integer frame number or existing label.
	 * @param playTimes Total plays: -1 forever, 0 (default) preserves the previous
	 * setting (initially 1), or a positive integer.
	 * @throws RangeError For invalid playTimes, or, when data exists, an unknown
	 * label or non-integer frame number.
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
	 * Jump to a 1-based frame/label and stop, clearing any label playback range.
	 * Integer indices clamp to the available range. With no frames, returns unchanged.
	 * @throws RangeError For an unknown label or non-integer number when data exists.
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
