import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SoundChannel } from '../src/blakron/media/SoundChannel.js';
import { Event } from '../src/blakron/events/Event.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBufferSource() {
	return {
		buffer: undefined as AudioBuffer | undefined,
		connect: vi.fn(),
		start: vi.fn(),
		stop: vi.fn(),
		disconnect: vi.fn(),
		onended: null as (() => void) | null,
	};
}

function makeGainNode() {
	return {
		gain: { value: 1 },
		connect: vi.fn(),
	};
}

function makeAudioContext() {
	const gainNode = makeGainNode();
	const bufferSource = makeBufferSource();
	const ctx = {
		currentTime: 0,
		destination: {},
		createGain: vi.fn(() => gainNode),
		createBufferSource: vi.fn(() => bufferSource),
	};
	return { ctx, gainNode, bufferSource };
}

function makeAudioBuffer(): AudioBuffer {
	return { duration: 3 } as unknown as AudioBuffer;
}

function makeHtmlAudio() {
	const audio = {
		currentTime: 0,
		volume: 1,
		play: vi.fn(),
		pause: vi.fn(),
		addEventListener: vi.fn((event: string, handler: () => void) => {
			if (event === 'ended') audio._endedHandler = handler;
		}),
		removeEventListener: vi.fn(),
		_endedHandler: null as (() => void) | null,
	};
	return audio;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SoundChannel (Web Audio)', () => {
	let ctx: ReturnType<typeof makeAudioContext>['ctx'];
	let gainNode: ReturnType<typeof makeAudioContext>['gainNode'];
	let bufferSource: ReturnType<typeof makeAudioContext>['bufferSource'];
	let audioBuffer: AudioBuffer;

	beforeEach(() => {
		({ ctx, gainNode, bufferSource } = makeAudioContext());
		audioBuffer = makeAudioBuffer();
	});

	it('starts playback on construction', () => {
		new SoundChannel(ctx as unknown as AudioContext, audioBuffer, undefined, 0, 0);
		expect(bufferSource.start).toHaveBeenCalledOnce();
	});

	it('initial volume is 1', () => {
		const ch = new SoundChannel(ctx as unknown as AudioContext, audioBuffer, undefined, 0, 0);
		expect(ch.volume).toBe(1);
	});

	it('setting volume clamps to [0, 1]', () => {
		const ch = new SoundChannel(ctx as unknown as AudioContext, audioBuffer, undefined, 0, 0);
		ch.volume = 2;
		expect(ch.volume).toBe(1);
		ch.volume = -1;
		expect(ch.volume).toBe(0);
	});

	it('setting volume updates gain node', () => {
		const ch = new SoundChannel(ctx as unknown as AudioContext, audioBuffer, undefined, 0, 0);
		ch.volume = 0.5;
		expect(gainNode.gain.value).toBe(0.5);
	});

	it('stop() prevents further playback', () => {
		const ch = new SoundChannel(ctx as unknown as AudioContext, audioBuffer, undefined, 0, 0);
		ch.stop();
		expect(bufferSource.stop).toHaveBeenCalledOnce();
	});

	it('stop() is idempotent', () => {
		const ch = new SoundChannel(ctx as unknown as AudioContext, audioBuffer, undefined, 0, 0);
		ch.stop();
		ch.stop();
		expect(bufferSource.stop).toHaveBeenCalledOnce();
	});

	it('dispatches SOUND_COMPLETE when loops exhausted', () => {
		const ch = new SoundChannel(ctx as unknown as AudioContext, audioBuffer, undefined, 0, 1);
		const completeFn = vi.fn();
		ch.addEventListener(Event.SOUND_COMPLETE, completeFn);

		// Simulate playback ending
		bufferSource.onended!();

		expect(completeFn).toHaveBeenCalledOnce();
	});

	it('loops = 0 means infinite — replays on ended', () => {
		new SoundChannel(ctx as unknown as AudioContext, audioBuffer, undefined, 0, 0);
		const callsBefore = (ctx.createBufferSource as ReturnType<typeof vi.fn>).mock.calls.length;

		bufferSource.onended!();

		expect(ctx.createBufferSource).toHaveBeenCalledTimes(callsBefore + 1);
	});

	it('does not dispatch SOUND_COMPLETE after stop()', () => {
		const ch = new SoundChannel(ctx as unknown as AudioContext, audioBuffer, undefined, 0, 1);
		const completeFn = vi.fn();
		ch.addEventListener(Event.SOUND_COMPLETE, completeFn);

		ch.stop();
		bufferSource.onended?.();

		expect(completeFn).not.toHaveBeenCalled();
	});
});

describe('SoundChannel (HTMLAudioElement fallback)', () => {
	it('calls play on construction', () => {
		const audio = makeHtmlAudio();
		new SoundChannel(undefined, undefined, audio as unknown as HTMLAudioElement, 0, 1);
		expect(audio.play).toHaveBeenCalledOnce();
	});

	it('sets currentTime from startTime', () => {
		const audio = makeHtmlAudio();
		new SoundChannel(undefined, undefined, audio as unknown as HTMLAudioElement, 1.5, 1);
		expect(audio.currentTime).toBe(1.5);
	});

	it('setting volume updates audio element', () => {
		const audio = makeHtmlAudio();
		const ch = new SoundChannel(undefined, undefined, audio as unknown as HTMLAudioElement, 0, 1);
		ch.volume = 0.3;
		expect(audio.volume).toBe(0.3);
	});

	it('stop() pauses audio', () => {
		const audio = makeHtmlAudio();
		const ch = new SoundChannel(undefined, undefined, audio as unknown as HTMLAudioElement, 0, 1);
		ch.stop();
		expect(audio.pause).toHaveBeenCalledOnce();
	});

	it('dispatches SOUND_COMPLETE on ended when loops exhausted', () => {
		const audio = makeHtmlAudio();
		const ch = new SoundChannel(undefined, undefined, audio as unknown as HTMLAudioElement, 0, 1);
		const completeFn = vi.fn();
		ch.addEventListener(Event.SOUND_COMPLETE, completeFn);

		audio._endedHandler!();

		expect(completeFn).toHaveBeenCalledOnce();
	});

	it('no-op channel (all undefined) does not throw', () => {
		expect(() => new SoundChannel(undefined, undefined, undefined, 0, 0)).not.toThrow();
	});
});
