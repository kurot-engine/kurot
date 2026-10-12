import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SoundChannel } from '../src/kurot/media/SoundChannel.js';
import { Event } from '../src/kurot/events/Event.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBufferSource() {
	return {
		buffer: undefined as AudioBuffer | undefined,
		loop: false,
		loopStart: 0,
		loopEnd: 0,
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
		disconnect: vi.fn(),
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
		loop: false,
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

	it('loops = 0 stays on one native looping node without restarting on ended', () => {
		new SoundChannel(ctx as unknown as AudioContext, audioBuffer, undefined, 0, 0);
		bufferSource.onended!();
		expect(bufferSource.loop).toBe(true);
		expect(bufferSource.loopStart).toBe(0);
		expect(bufferSource.loopEnd).toBe(3);
		expect(bufferSource.start).toHaveBeenCalledWith(0, 0);
		expect(ctx.createBufferSource).toHaveBeenCalledOnce();
	});

	it.each([1, 2, 3, 0.5, 2.2, NaN])('loops = %s ends after the initial partial play and full repetitions', loops => {
		ctx.currentTime = 10;
		new SoundChannel(ctx as unknown as AudioContext, audioBuffer, undefined, 1, loops);
		const count = loops > 0 ? Math.ceil(loops) : 1;
		expect(bufferSource.loop).toBe(count > 1);
		expect(bufferSource.start).toHaveBeenCalledWith(10, 1, 2 + 3 * (count - 1));
		expect(bufferSource.stop).not.toHaveBeenCalled();
	});

	it.each([-1, -Infinity, Infinity])('loops = %s is unlimited', loops => {
		new SoundChannel(ctx as unknown as AudioContext, audioBuffer, undefined, 1, loops);
		expect(bufferSource.loop).toBe(true);
		expect(bufferSource.start).toHaveBeenCalledWith(0, 1);
	});

	it.each([3, 4])('an offset of %s counts an empty initial play before the next full iteration', offset => {
		new SoundChannel(ctx as unknown as AudioContext, audioBuffer, undefined, offset, 2);
		expect(bufferSource.start).toHaveBeenCalledWith(0, offset, 3);
	});

	it('position wraps from the initial offset and uses the audio clock', () => {
		ctx.currentTime = 10;
		const ch = new SoundChannel(ctx as unknown as AudioContext, audioBuffer, undefined, 1, 0);
		expect(ch.position).toBe(1);
		ctx.currentTime = 11.5;
		expect(ch.position).toBe(2.5);
		ctx.currentTime = 12.25;
		expect(ch.position).toBe(0.25);
		ctx.currentTime = 18.5;
		expect(ch.position).toBe(0.5);
		ch.stop();
		expect(ch.position).toBe(0);
		expect(gainNode.disconnect).toHaveBeenCalledOnce();
	});

	it('completion is emitted once, freezes position and releases nodes even with a delayed callback', () => {
		const ch = new SoundChannel(ctx as unknown as AudioContext, audioBuffer, undefined, 1, 2);
		const complete = vi.fn();
		ch.addEventListener(Event.SOUND_COMPLETE, complete);
		const ended = bufferSource.onended!;
		ctx.currentTime = 100;
		expect(ch.position).toBe(3);
		ended();
		ended();
		expect(complete).toHaveBeenCalledOnce();
		expect(ctx.createBufferSource).toHaveBeenCalledOnce();
		expect(bufferSource.disconnect).toHaveBeenCalledOnce();
		expect(gainNode.disconnect).toHaveBeenCalledOnce();
		expect(ch.position).toBe(3);
	});

	it('does not dispatch SOUND_COMPLETE after stop()', () => {
		const ch = new SoundChannel(ctx as unknown as AudioContext, audioBuffer, undefined, 0, 1);
		const completeFn = vi.fn();
		ch.addEventListener(Event.SOUND_COMPLETE, completeFn);
		const queuedEnded = bufferSource.onended!;

		ch.stop();
		queuedEnded();

		expect(completeFn).not.toHaveBeenCalled();
		expect(ctx.createBufferSource).toHaveBeenCalledOnce();
		expect(bufferSource.disconnect).toHaveBeenCalledOnce();
	});
});

describe('SoundChannel (HTMLAudioElement fallback)', () => {
	it.each([0, -1, Infinity])('loops = %s uses native HTML looping', loops => {
		const audio = makeHtmlAudio();
		const ch = new SoundChannel(undefined, undefined, audio as unknown as HTMLAudioElement, 1, loops);
		expect(audio.loop).toBe(true);
		expect(audio.addEventListener).not.toHaveBeenCalled();
		expect(audio.play).toHaveBeenCalledOnce();
		ch.stop();
		expect(audio.loop).toBe(false);
		expect(audio.currentTime).toBe(0);
	});

	it('finite HTML fallback counts total plays and repeats from zero after the first offset', () => {
		const audio = makeHtmlAudio();
		const ch = new SoundChannel(undefined, undefined, audio as unknown as HTMLAudioElement, 1, 3);
		const complete = vi.fn();
		ch.addEventListener(Event.SOUND_COMPLETE, complete);
		expect(audio.loop).toBe(false);
		audio._endedHandler!();
		expect(audio.currentTime).toBe(0);
		audio._endedHandler!();
		expect(complete).not.toHaveBeenCalled();
		audio._endedHandler!();
		audio._endedHandler!();
		expect(audio.play).toHaveBeenCalledTimes(3);
		expect(complete).toHaveBeenCalledOnce();
	});
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
