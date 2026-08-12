import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Video } from '../src/blakron/media/Video.js';
import { Event } from '../src/blakron/events/Event.js';

// ── HTMLVideoElement mock ──────────────────────────────────────────────────────

function makeVideoElement() {
	const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
	const video = {
		src: '',
		controls: false,
		loop: false,
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
		play: vi.fn(() => Promise.resolve()),
		pause: vi.fn(),
		load: vi.fn(),
		emit(event: string) {
			listeners[event]?.forEach(h => h());
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
