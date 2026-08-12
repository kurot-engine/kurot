import { afterEach, describe, expect, it, vi } from 'vitest';
import { ticker } from '@blakron/core';
import { MovieClip } from '../src/blakron/display/MovieClip.js';
import { MovieClipData } from '../src/blakron/display/MovieClipData.js';
import { MovieClipEvent } from '../src/blakron/display/types.js';

function createData(durations: number[]): MovieClipData {
	const data = new MovieClipData();
	for (const duration of durations) {
		data.addFrame(undefined, duration);
	}
	return data;
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('MovieClipData', () => {
	it('stores validated frame durations and reports their total', () => {
		const data = createData([100, 500, 50]);

		expect(data.frameCount).toBe(3);
		expect(data.totalDuration).toBe(650);
		expect(data.getFrame(1)?.duration).toBe(500);
	});

	it('keeps factory fps metadata and frame durations in sync', () => {
		const data = MovieClipData.fromTextureArray([undefined, undefined] as never[], 10);

		expect(data.frameRate).toBe(10);
		expect(data.getFrame(0)?.duration).toBe(100);
		expect(data.getFrame(1)?.duration).toBe(100);
	});

	it('builds labeled fixed-rate frames from a SpriteSheet', () => {
		const idleTexture = {} as never;
		const sheet = {
			getTexture: vi.fn((name: string) => (name === 'idle' ? idleTexture : undefined)),
		};
		const data = MovieClipData.fromSpriteSheet(sheet, ['idle', 'missing'], 20);

		expect(data.frameRate).toBe(20);
		expect(data.getFrame(0)).toMatchObject({ texture: idleTexture, duration: 50, label: 'idle' });
		expect(data.getFrameByLabel('missing')).toBe(1);
		expect(sheet.getTexture).toHaveBeenCalledTimes(2);
	});

	it('rejects invalid frame timing, rates, indices, and frame-event names', () => {
		const data = new MovieClipData();

		expect(() => (data.frameRate = 0)).toThrow(RangeError);
		expect(() => (data.frameRate = Number.POSITIVE_INFINITY)).toThrow(RangeError);
		expect(() => data.addFrame(undefined, 0)).toThrow(RangeError);
		expect(() => data.addFrame(undefined, Number.NaN)).toThrow(RangeError);
		expect(() => data.setFrameEvent(0, 'event')).toThrow(RangeError);
		expect(() => MovieClipData.fromTextureArray([], -1)).toThrow(RangeError);
		expect(() => MovieClipData.fromSpriteSheet({ getTexture: () => undefined }, [], Number.NaN)).toThrow(
			RangeError,
		);

		data.addFrame(undefined, 100);
		expect(() => data.setFrameEvent(1.5, 'event')).toThrow(RangeError);
		expect(() => data.setFrameEvent(0, '')).toThrow(RangeError);
	});
});

describe('MovieClip external frame control', () => {
	it('advances exactly one frame per external call, regardless of duration metadata', () => {
		const startTick = vi.spyOn(ticker, 'startTick');
		const clip = new MovieClip(createData([1000, 1, 500]));

		clip.play();
		expect(startTick).not.toHaveBeenCalled();
		expect(clip.currentFrame).toBe(1);

		clip.advanceFrame();
		expect(clip.currentFrame).toBe(2);
		clip.advanceFrame();
		expect(clip.currentFrame).toBe(3);

		clip.stop();
		clip.advanceFrame();
		expect(clip.currentFrame).toBe(3);
	});

	it('leaves scheduling cadence to the external controller', () => {
		const data = createData([250, 250, 250, 250]);
		const frequent = new MovieClip(data);
		const sparse = new MovieClip(data);
		frequent.play(-1);
		sparse.play(-1);

		// The external controller decides how many logical frame steps elapsed.
		for (let i = 0; i < 4; i++) frequent.advanceFrame();
		for (let i = 0; i < 4; i++) sparse.advanceFrame();

		expect(frequent.currentFrame).toBe(1);
		expect(sparse.currentFrame).toBe(1);
	});

	it('stops stale playback when a loop listener replaces the data source', () => {
		const clip = new MovieClip(createData([10]));
		const replacement = createData([10, 10]);
		clip.addEventListener(MovieClipEvent.LOOP_COMPLETE, () => {
			clip.movieClipData = replacement;
		});
		clip.play(-1);

		clip.advanceFrame();

		expect(clip.movieClipData).toBe(replacement);
		expect(clip.currentFrame).toBe(1);
		expect(clip.isPlaying).toBe(false);
	});

	it('dispatches frame, loop, completion, and custom events without duplicating the final frame event', () => {
		const data = createData([100, 100]);
		data.setFrameEvent(1, 'attack');
		const clip = new MovieClip(data);
		const frameChanges = vi.fn();
		const frameEvent = vi.fn();
		const loops = vi.fn();
		const completes = vi.fn();
		clip.addEventListener(MovieClipEvent.FRAME_CHANGE, frameChanges);
		clip.addEventListener('attack', frameEvent);
		clip.addEventListener(MovieClipEvent.LOOP_COMPLETE, loops);
		clip.addEventListener(MovieClipEvent.COMPLETE, completes);
		clip.play(2);

		clip.advanceFrame();
		clip.advanceFrame();
		clip.advanceFrame();
		clip.advanceFrame();

		expect(frameChanges).toHaveBeenCalledTimes(3);
		expect(frameEvent).toHaveBeenCalledTimes(2);
		expect(loops).toHaveBeenCalledTimes(1);
		expect(completes).toHaveBeenCalledTimes(1);
		expect(clip.isPlaying).toBe(false);
	});

	it('allows a completion handler to start a new playback session', () => {
		const clip = new MovieClip(createData([10]));
		let completeCount = 0;
		clip.addEventListener(MovieClipEvent.COMPLETE, () => {
			completeCount++;
			if (completeCount === 1) clip.play(1);
		});
		clip.play();

		clip.advanceFrame();
		expect(clip.isPlaying).toBe(true);
		clip.advanceFrame();

		expect(completeCount).toBe(2);
		expect(clip.isPlaying).toBe(false);
	});

	it('does not reset an in-progress play session when play(0) is called', () => {
		const clip = new MovieClip(createData([100, 100]));
		const completed = vi.fn();
		clip.addEventListener(MovieClipEvent.COMPLETE, completed);
		clip.play(2);

		clip.advanceFrame();
		clip.advanceFrame();
		expect(clip.currentFrame).toBe(1);

		clip.play(0);
		clip.advanceFrame();
		clip.advanceFrame();

		expect(completed).toHaveBeenCalledTimes(1);
		expect(clip.isPlaying).toBe(false);
	});

	it('supports infinite playback without stopping', () => {
		const clip = new MovieClip(createData([25]));
		const loops = vi.fn();
		clip.addEventListener(MovieClipEvent.LOOP_COMPLETE, loops);
		clip.play(-1);

		for (let i = 0; i < 4; i++) clip.advanceFrame();

		expect(loops).toHaveBeenCalledTimes(4);
		expect(clip.isPlaying).toBe(true);
	});

	it('keeps finite playback within an inclusive label range', () => {
		const data = createData([100, 100, 100, 100]);
		data.setFrameLabel('attack', 1, 2);
		const clip = new MovieClip(data);
		const loops = vi.fn();
		const completes = vi.fn();
		clip.addEventListener(MovieClipEvent.LOOP_COMPLETE, loops);
		clip.addEventListener(MovieClipEvent.COMPLETE, completes);

		clip.gotoAndPlay('attack', 2);
		expect(clip.currentFrame).toBe(2);

		clip.advanceFrame();
		expect(clip.currentFrame).toBe(3);
		clip.advanceFrame();
		expect(clip.currentFrame).toBe(2);
		clip.advanceFrame();
		expect(clip.currentFrame).toBe(3);
		clip.advanceFrame();

		expect(loops).toHaveBeenCalledTimes(1);
		expect(completes).toHaveBeenCalledTimes(1);
		expect(clip.currentFrame).toBe(3);
		expect(clip.isPlaying).toBe(false);
	});
});

describe('MovieClip control and lifecycle', () => {
	it('stops playback when its data is replaced with empty or undefined data', () => {
		const data = createData([100]);
		const clip = new MovieClip(data);

		clip.play();
		clip.movieClipData = new MovieClipData();
		expect(clip.isPlaying).toBe(false);
		expect(clip.totalFrames).toBe(0);

		clip.movieClipData = data;
		clip.play();
		clip.movieClipData = undefined;
		expect(clip.isPlaying).toBe(false);
		expect(clip.totalFrames).toBe(0);
	});

	it('keeps nextFrame as manual navigation that stops playback', () => {
		const clip = new MovieClip(createData([100, 100, 100]));
		clip.play();

		clip.nextFrame();

		expect(clip.currentFrame).toBe(2);
		expect(clip.isPlaying).toBe(false);
	});

	it('resolves labels, clamps frame navigation, and starts a new session with gotoAndPlay', () => {
		const data = new MovieClipData();
		data.addFrame(undefined, 100, 'start');
		data.addFrame(undefined, 100, 'middle');
		data.addFrame(undefined, 100, 'end');
		const clip = new MovieClip(data);

		clip.gotoAndStop('middle');
		expect(clip.currentFrame).toBe(2);
		clip.prevFrame();
		expect(clip.currentFrame).toBe(1);
		clip.gotoAndStop(999);
		expect(clip.currentFrame).toBe(3);

		clip.gotoAndPlay('start', 1);
		expect(clip.currentFrame).toBe(1);
		expect(clip.isPlaying).toBe(true);
	});

	it('stops when it is removed from the stage', () => {
		const clip = new MovieClip(createData([100]));

		clip.play();
		clip.$onRemoveFromStage();

		expect(clip.isPlaying).toBe(false);
	});

	it('rejects invalid play counts, frame numbers, and labels', () => {
		const data = new MovieClipData();
		data.addFrame(undefined, 100, 'known');
		const clip = new MovieClip(data);

		expect(() => clip.play(-2)).toThrow(RangeError);
		expect(() => clip.play(1.5)).toThrow(RangeError);
		expect(() => clip.gotoAndStop(Number.NaN)).toThrow(RangeError);
		expect(() => clip.gotoAndStop(1.5)).toThrow(RangeError);
		expect(() => clip.gotoAndStop('missing')).toThrow(RangeError);
	});
});
