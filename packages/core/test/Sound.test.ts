import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Event } from '../src/blakron/events/Event.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

interface XhrMock {
	open: ReturnType<typeof vi.fn>;
	send: ReturnType<typeof vi.fn>;
	responseType: string;
	status: number;
	response: ArrayBuffer;
	onload: (() => void) | null;
	onerror: (() => void) | null;
}

function installAudioContextMock() {
	const fakeBuffer = { duration: 2 } as unknown as AudioBuffer;
	const bufferSource = {
		buffer: undefined as AudioBuffer | undefined,
		connect: vi.fn(),
		start: vi.fn(),
		stop: vi.fn(),
		disconnect: vi.fn(),
		onended: null as (() => void) | null,
	};
	const gainNode = { gain: { value: 1 }, connect: vi.fn() };
	const ctx = {
		currentTime: 0,
		destination: {},
		createGain: vi.fn(() => gainNode),
		createBufferSource: vi.fn(() => bufferSource),
		decodeAudioData: vi.fn((_buf: ArrayBuffer, onSuccess: (b: AudioBuffer) => void) => {
			Promise.resolve().then(() => onSuccess(fakeBuffer));
		}),
	};

	class FakeAudioContext {
		currentTime = ctx.currentTime;
		destination = ctx.destination;
		createGain = ctx.createGain;
		createBufferSource = ctx.createBufferSource;
		decodeAudioData = ctx.decodeAudioData;
	}

	const win = window as unknown as Record<string, unknown>;
	const prev = win['AudioContext'];
	win['AudioContext'] = FakeAudioContext;
	return {
		ctx,
		restore: () => {
			win['AudioContext'] = prev;
		},
	};
}

function installXhrMock(status = 200): { xhr: XhrMock; restore: () => void } {
	const xhr: XhrMock = {
		open: vi.fn(),
		send: vi.fn(),
		responseType: '',
		status,
		response: new ArrayBuffer(8),
		onload: null,
		onerror: null,
	};
	const OrigXHR = window.XMLHttpRequest;
	window.XMLHttpRequest = class {
		open(...args: unknown[]) {
			(xhr.open as (...a: unknown[]) => void)(...args);
		}
		send(...args: unknown[]) {
			(xhr.send as (...a: unknown[]) => void)(...args);
		}
		set responseType(v: string) {
			xhr.responseType = v;
		}
		get status() {
			return xhr.status;
		}
		get response() {
			return xhr.response;
		}
		set onload(fn: (() => void) | null) {
			xhr.onload = fn;
		}
		set onerror(fn: (() => void) | null) {
			xhr.onerror = fn;
		}
	} as unknown as typeof XMLHttpRequest;
	return {
		xhr,
		restore: () => {
			window.XMLHttpRequest = OrigXHR;
		},
	};
}

function installAudioMock() {
	const OrigAudio = globalThis.Audio;
	const instances: Array<{
		src: string;
		listeners: Record<string, Array<(...args: unknown[]) => void>>;
	}> = [];

	globalThis.Audio = class MockAudio {
		src = '';
		listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
		preload = '';
		addEventListener(event: string, fn: (...args: unknown[]) => void, _opts?: unknown) {
			(this.listeners[event] ??= []).push(fn);
		}
		removeEventListener() {
			// no-op
		}
		load() {
			// no-op: prevent real network requests
		}
		cloneNode() {
			const clone = new (globalThis.Audio as unknown as new () => HTMLAudioElement)();
			return clone;
		}
		constructor() {
			instances.push({ src: '', listeners: this.listeners });
		}
	} as unknown as typeof Audio;

	return {
		instances,
		restore: () => {
			globalThis.Audio = OrigAudio;
		},
	};
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Sound', () => {
	let Sound: typeof import('../src/blakron/media/Sound.js').Sound;
	let SoundType: typeof import('../src/blakron/media/Sound.js').SoundType;
	let SoundChannel: typeof import('../src/blakron/media/SoundChannel.js').SoundChannel;

	beforeEach(async () => {
		// Reset module state so sharedContext in Sound.ts is re-initialized
		vi.resetModules();
		const soundModule = await import('../src/blakron/media/Sound.js');
		Sound = soundModule.Sound;
		SoundType = soundModule.SoundType;
		const channelModule = await import('../src/blakron/media/SoundChannel.js');
		SoundChannel = channelModule.SoundChannel;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('default type is EFFECT', () => {
		const sound = new Sound();
		expect(sound.type).toBe(SoundType.EFFECT);
	});

	it('length is 0 before load', () => {
		const sound = new Sound();
		expect(sound.length).toBe(0);
	});

	it('play before load dispatches IOErrorEvent and returns SoundChannel', () => {
		const sound = new Sound();
		const errorFn = vi.fn();
		sound.addEventListener('ioError', errorFn);
		const channel = sound.play();
		expect(errorFn).toHaveBeenCalledOnce();
		expect(channel).toBeInstanceOf(SoundChannel);
	});

	it('load via Web Audio dispatches COMPLETE and sets length', async () => {
		const { restore: restoreCtx } = installAudioContextMock();
		const { xhr, restore: restoreXhr } = installXhrMock(200);

		try {
			const sound = new Sound();
			const completeFn = vi.fn();
			sound.addEventListener(Event.COMPLETE, completeFn);

			sound.load('test.mp3');
			xhr.onload!();

			await vi.waitFor(() => expect(completeFn).toHaveBeenCalledOnce());
			expect(sound.length).toBe(2);
		} finally {
			restoreCtx();
			restoreXhr();
		}
	});

	it('load dispatches IOErrorEvent on XHR network error', () => {
		const { restore: restoreCtx } = installAudioContextMock();
		const { xhr, restore: restoreXhr } = installXhrMock(200);

		try {
			const sound = new Sound();
			const errorFn = vi.fn();
			sound.addEventListener('ioError', errorFn);

			sound.load('bad.mp3');
			xhr.onerror!();

			expect(errorFn).toHaveBeenCalledOnce();
		} finally {
			restoreCtx();
			restoreXhr();
		}
	});

	it('load dispatches IOErrorEvent on HTTP 404', () => {
		const { restore: restoreCtx } = installAudioContextMock();
		const { xhr, restore: restoreXhr } = installXhrMock(404);

		try {
			const sound = new Sound();
			const errorFn = vi.fn();
			sound.addEventListener('ioError', errorFn);

			sound.load('missing.mp3');
			xhr.onload!();

			expect(errorFn).toHaveBeenCalledOnce();
		} finally {
			restoreCtx();
			restoreXhr();
		}
	});

	it('play after Web Audio load returns SoundChannel', async () => {
		const { restore: restoreCtx } = installAudioContextMock();
		const { xhr, restore: restoreXhr } = installXhrMock(200);

		try {
			const sound = new Sound();
			sound.load('test.mp3');
			xhr.onload!();

			await vi.waitFor(() => expect(sound.length).toBe(2));

			const channel = sound.play();
			expect(channel).toBeInstanceOf(SoundChannel);
		} finally {
			restoreCtx();
			restoreXhr();
		}
	});

	it('close resets state and play dispatches error', async () => {
		const { restore: restoreCtx } = installAudioContextMock();
		const { xhr, restore: restoreXhr } = installXhrMock(200);

		try {
			const sound = new Sound();
			sound.load('test.mp3');
			xhr.onload!();
			await vi.waitFor(() => expect(sound.length).toBe(2));

			sound.close();
			expect(sound.length).toBe(0);

			const errorFn = vi.fn();
			sound.addEventListener('ioError', errorFn);
			sound.play();
			expect(errorFn).toHaveBeenCalledOnce();
		} finally {
			restoreCtx();
			restoreXhr();
		}
	});

	it('falls back to HTMLAudioElement when AudioContext unavailable', () => {
		const win = window as unknown as Record<string, unknown>;
		const prevAC = win['AudioContext'];
		const prevWK = win['webkitAudioContext'];
		win['AudioContext'] = undefined;
		win['webkitAudioContext'] = undefined;

		const { instances: audioInstances, restore: restoreAudio } = installAudioMock();

		try {
			const sound = new Sound();
			sound.load('test.mp3');

			// Verify an Audio was created with the correct src
			expect(audioInstances.length).toBeGreaterThanOrEqual(1);

			// Not loaded yet (canplaythrough hasn't fired)
			expect(sound.length).toBe(0);

			// Simulate canplaythrough to complete the load
			const completeFn = vi.fn();
			sound.addEventListener(Event.COMPLETE, completeFn);
			const lastAudio = audioInstances[audioInstances.length - 1];
			const canPlayHandlers = lastAudio.listeners['canplaythrough'];
			expect(canPlayHandlers).toBeDefined();
			canPlayHandlers![0]();
			expect(completeFn).toHaveBeenCalledOnce();
			expect(sound.length).toBe(0); // HTML audio duration is 0 without real load
		} finally {
			win['AudioContext'] = prevAC;
			win['webkitAudioContext'] = prevWK;
			restoreAudio();
		}
	});
});
