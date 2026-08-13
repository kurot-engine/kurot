import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Video } from '../src/kurot/media/Video.js';
import { Event } from '../src/kurot/events/Event.js';

// ── HTMLVideoElement mock ──────────────────────────────────────────────────────

function makeVideoElement() {
	const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
	const frameCallbacks = new Map<number, () => void>();
	let nextFrameCallbackId = 1;
	const video = {
		src: '',
		controls: false,
		loop: false,
		muted: false,
		defaultMuted: false,
		playsInline: false,
		volume: 1,
		currentTime: 0,
		duration: 0,
		videoWidth: 320,
		videoHeight: 240,
		width: 0,
		height: 0,
		paused: true,
		parentElement: null as HTMLElement | null,
		setAttribute: vi.fn(),
		removeAttribute: vi.fn(),
		remove: vi.fn(),
		addEventListener: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
			if (!listeners[event]) {
				listeners[event] = [];
			}
			listeners[event].push(handler);
		}),
		removeEventListener: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
			if (listeners[event]) {
				listeners[event] = listeners[event].filter(h => h !== handler);
			}
		}),
		play: vi.fn(() => {
			video.paused = false;
			return Promise.resolve();
		}),
		pause: vi.fn(() => {
			video.paused = true;
		}),
		load: vi.fn(),
		requestVideoFrameCallback: vi.fn((callback: () => void) => {
			const id = nextFrameCallbackId++;
			frameCallbacks.set(id, callback);
			return id;
		}),
		cancelVideoFrameCallback: vi.fn((id: number) => {
			frameCallbacks.delete(id);
		}),
		emit(event: string) {
			listeners[event]?.forEach(h => h());
		},
		emitFrame() {
			const callbacks = [...frameCallbacks.values()];
			frameCallbacks.clear();
			callbacks.forEach(callback => callback());
		},
	};
	return video;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Video', () => {
	let videoEl: ReturnType<typeof makeVideoElement>;
	let originalCreateElement: typeof document.createElement;

	beforeEach(() => {
		videoEl = makeVideoElement();
		originalCreateElement = document.createElement.bind(document);
		vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
			if (tag === 'video') {
				return videoEl as unknown as HTMLVideoElement;
			}
			return originalCreateElement(tag);
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('constructs without throwing', () => {
		expect(() => new Video()).not.toThrow();
	});

	it('constructs with url and calls load', () => {
		new Video('test.mp4');
		expect(videoEl.load).toHaveBeenCalledOnce();
	});

	it('fullscreen defaults to true', () => {
		const v = new Video();
		expect(v.fullscreen).toBe(true);
	});

	it('src getter/setter updates video element', () => {
		const v = new Video();
		v.src = 'clip.mp4';
		expect(v.src).toBe('clip.mp4');
		expect(videoEl.src).toBe('clip.mp4');
	});

	it('volume getter/setter clamps to [0, 1]', () => {
		const v = new Video();
		v.volume = 2;
		expect(v.volume).toBe(1);
		v.volume = -1;
		expect(v.volume).toBe(0);
	});

	it('maps muted, loop, and playsInline to the video element', () => {
		const v = new Video();
		v.muted = true;
		v.loop = true;
		v.playsInline = false;

		expect(v.muted).toBe(true);
		expect(videoEl.defaultMuted).toBe(true);
		expect(v.loop).toBe(true);
		expect(v.playsInline).toBe(false);
	});

	it('position getter/setter maps to currentTime', () => {
		const v = new Video();
		v.position = 3.5;
		expect(videoEl.currentTime).toBe(3.5);
		expect(v.position).toBe(3.5);
	});

	it('paused reflects video element state', () => {
		const v = new Video();
		expect(v.paused).toBe(true);
	});

	it('length returns video duration', () => {
		const v = new Video();
		videoEl.duration = 10;
		expect(v.length).toBe(10);
	});

	it('dispatches COMPLETE on canplaythrough', () => {
		const v = new Video();
		const completeFn = vi.fn();
		v.addEventListener(Event.COMPLETE, completeFn);

		videoEl.emit('canplaythrough');

		expect(completeFn).toHaveBeenCalledOnce();
	});

	it('dispatches IOErrorEvent on video error', () => {
		const v = new Video();
		const errorFn = vi.fn();
		v.addEventListener('ioError', errorFn);

		videoEl.emit('error');

		expect(errorFn).toHaveBeenCalledOnce();
	});

	it('dispatches ENDED on video ended', () => {
		const v = new Video();
		const endedFn = vi.fn();
		v.addEventListener(Event.ENDED, endedFn);

		videoEl.emit('canplaythrough'); // mark loaded
		videoEl.emit('ended');

		expect(endedFn).toHaveBeenCalledOnce();
	});

	it('width/height use video dimensions after load', () => {
		const v = new Video();
		videoEl.videoWidth = 640;
		videoEl.videoHeight = 480;
		videoEl.emit('canplaythrough');

		expect(v.width).toBe(640);
		expect(v.height).toBe(480);
	});

	it('becomes directly renderable after load', () => {
		const v = new Video();
		videoEl.emit('canplaythrough');

		expect(v.texture?.bitmapData?.source).toBe(videoEl);
		expect(v.bitmapData).toBe(v.texture?.bitmapData);
	});

	it('invalidates the video texture when a decoded frame arrives', async () => {
		const v = new Video();
		v.fullscreen = false;
		videoEl.emit('canplaythrough');
		const bitmapData = v.bitmapData!;
		const initialVersion = bitmapData.contentVersion;

		v.play();
		await Promise.resolve();
		videoEl.emitFrame();

		expect(bitmapData.contentVersion).toBe(initialVersion + 1);
		expect(videoEl.requestVideoFrameCallback).toHaveBeenCalled();
	});

	it('restores the video texture when playback starts', async () => {
		const v = new Video();
		v.fullscreen = false;
		videoEl.emit('canplaythrough');
		const videoTexture = v.texture;
		v.texture = undefined;

		v.play();
		await Promise.resolve();

		expect(v.texture).toBe(videoTexture);
	});

	it('explicit width/height override video dimensions', () => {
		const v = new Video();
		videoEl.emit('canplaythrough');
		v.width = 100;
		v.height = 50;
		expect(v.width).toBe(100);
		expect(v.height).toBe(50);
	});

	it('bitmapData is undefined before load', () => {
		const v = new Video();
		expect(v.bitmapData).toBeUndefined();
	});

	it('close resets loaded state', () => {
		const v = new Video();
		videoEl.emit('canplaythrough');
		v.close();
		expect(v.bitmapData).toBeUndefined();
	});

	it('pause sets paused state', () => {
		const v = new Video();
		videoEl.emit('canplaythrough');
		v.pause();
		expect(videoEl.pause).toHaveBeenCalled();
	});
});
