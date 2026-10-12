import { Event } from '../events/Event.js';
import { EventDispatcher } from '../events/EventDispatcher.js';

/**
 * SoundChannel controls a single playback of a Sound.
 * Supports both Web Audio API (preferred) and HTMLAudioElement (fallback).
 */
export class SoundChannel extends EventDispatcher {
	// ── Instance fields ───────────────────────────────────────────────────────

	private _loops: number;
	private _loopCount = 0;
	private _volume = 1;

	private _context?: AudioContext;
	private _gainNode?: GainNode;
	private _bufferSource?: AudioBufferSourceNode;
	private _audioBuffer?: AudioBuffer;
	private _webAudioStartTime = 0;
	private _startOffset = 0;
	private _playbackDuration?: number;
	private _endPosition = 0;

	private _audio?: HTMLAudioElement;

	private _stopped = false;

	// ── Constructor (Web Audio) ───────────────────────────────────────────────

	constructor(
		context: AudioContext | undefined,
		audioBuffer: AudioBuffer | undefined,
		audio: HTMLAudioElement | undefined,
		startTime: number,
		loops: number,
	) {
		super();
		this._loops = loops;

		if (context && audioBuffer) {
			this._context = context;
			this._audioBuffer = audioBuffer;
			this._startOffset = startTime;
			this._gainNode = context.createGain();
			this._gainNode.connect(context.destination);
			this.playWebAudio();
		} else if (audio) {
			this._audio = audio;
			this._audio.loop = loops <= 0 || loops === Infinity;
			this._audio.currentTime = startTime;
			if (!this._audio.loop) {
				this._audio.addEventListener('ended', this.onHtmlAudioEnded);
			}
			this._audio.play();
		}
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	public get volume(): number {
		return this._volume;
	}
	public set volume(value: number) {
		this._volume = Math.max(0, Math.min(1, value));
		if (this._gainNode) this._gainNode.gain.value = this._volume;
		if (this._audio) this._audio.volume = this._volume;
	}

	public get position(): number {
		if (this._context && this._audioBuffer) {
			if (this._stopped) return this._endPosition;
			const duration = this._audioBuffer.duration;
			const elapsed = Math.max(0, this._context.currentTime - this._webAudioStartTime);
			if (this._playbackDuration !== undefined && elapsed >= this._playbackDuration) return duration;
			const position = this._startOffset + elapsed;
			return position < duration ? position : duration > 0 ? position % duration : 0;
		}
		return this._audio?.currentTime ?? 0;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	public stop(): void {
		if (this._stopped) return;
		this._stopped = true;

		if (this._bufferSource) {
			this._bufferSource.onended = null;
			this._bufferSource.stop();
		}
		this.disconnectWebAudio();

		if (this._audio) {
			this._audio.removeEventListener('ended', this.onHtmlAudioEnded);
			this._audio.loop = false;
			this._audio.pause();
			this._audio.currentTime = 0;
		}
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private playWebAudio(): void {
		if (!this._context || !this._audioBuffer || !this._gainNode) return;

		const source = this._context.createBufferSource();
		this._bufferSource = source;
		source.buffer = this._audioBuffer;
		const duration = this._audioBuffer.duration;
		// Positive fractional counts historically play ceil(loops) times; NaN plays once.
		const count = this._loops <= 0 ? Infinity : this._loops > 0 ? Math.ceil(this._loops) : 1;
		source.loop = count > 1;
		source.loopStart = 0;
		source.loopEnd = duration;
		source.connect(this._gainNode);
		this._gainNode.gain.value = this._volume;
		source.onended = this.onWebAudioEnded;
		this._webAudioStartTime = this._context.currentTime;
		const offset = Math.min(this._startOffset, duration);
		if (Number.isFinite(count)) {
			// The initial partial play counts once; subsequent iterations start at zero.
			this._playbackDuration = duration - offset + duration * (count - 1);
			source.start(this._webAudioStartTime, this._startOffset, this._playbackDuration);
		} else {
			source.start(this._webAudioStartTime, this._startOffset);
		}
		this._startOffset = offset;
	}

	private onWebAudioEnded = (): void => {
		if (this._stopped || this._playbackDuration === undefined) return;
		this._stopped = true;
		this._endPosition = this._audioBuffer?.duration ?? 0;
		this.disconnectWebAudio();
		this.dispatchEventWith(Event.SOUND_COMPLETE);
	};

	private disconnectWebAudio(): void {
		if (this._bufferSource) {
			this._bufferSource.onended = null;
			this._bufferSource.disconnect();
			this._bufferSource = undefined;
		}
		this._gainNode?.disconnect();
		this._gainNode = undefined;
	}

	private onHtmlAudioEnded = (): void => {
		if (this._stopped) return;
		this._loopCount++;
		if (this._loops <= 0 || this._loopCount < this._loops) {
			this._audio!.currentTime = 0;
			this._audio!.play();
		} else {
			this._audio!.removeEventListener('ended', this.onHtmlAudioEnded);
			this._stopped = true;
			this.dispatchEventWith(Event.SOUND_COMPLETE);
		}
	};
}
