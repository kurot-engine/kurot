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

	// Web Audio API
	private _context?: AudioContext;
	private _gainNode?: GainNode;
	private _bufferSource?: AudioBufferSourceNode;
	private _audioBuffer?: AudioBuffer;
	private _webAudioStartTime = 0;
	private _startOffset = 0;

	// HTMLAudioElement fallback
	private _audio?: HTMLAudioElement;

	private _stopped = false;

	// ── Constructor (Web Audio) ───────────────────────────────────────────────

	/** @internal Use Sound.play() to create instances. */
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
			this._audio.currentTime = startTime;
			this._audio.addEventListener('ended', this.onHtmlAudioEnded);
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
		if (this._context && this._bufferSource) {
			return this._context.currentTime - this._webAudioStartTime + this._startOffset;
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
			this._bufferSource.disconnect();
			this._bufferSource = undefined;
		}

		if (this._audio) {
			this._audio.removeEventListener('ended', this.onHtmlAudioEnded);
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
		source.connect(this._gainNode);
		this._gainNode.gain.value = this._volume;
		source.onended = this.onWebAudioEnded;
		this._webAudioStartTime = this._context.currentTime;
		source.start(0, this._startOffset);
	}

	private onWebAudioEnded = (): void => {
		if (this._stopped) return;
		this._loopCount++;
		if (this._loops <= 0 || this._loopCount < this._loops) {
			this._startOffset = 0;
			this.playWebAudio();
		} else {
			this._stopped = true;
			this.dispatchEventWith(Event.SOUND_COMPLETE);
		}
	};

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
