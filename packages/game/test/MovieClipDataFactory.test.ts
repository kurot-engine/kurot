import { describe, expect, it, vi } from 'vitest';
import { Texture } from '@kurot/core';
import { MovieClip } from '../src/blakron/display/MovieClip.js';
import { MovieClipDataFactory } from '../src/blakron/display/MovieClipDataFactory.js';
import { MovieClipEvent } from '../src/blakron/display/types.js';

function createFactory(): MovieClipDataFactory {
	return new MovieClipDataFactory(
		{
			mc: {
				hero: {
					frameRate: 20,
					frames: [
						{ res: 'idle', x: -2, y: 3, duration: 2 },
						{ res: 'attack', x: 1, y: -1 },
						{ res: 'after' },
					],
					labels: [{ name: 'attack', frame: 3, end: 4 }],
					events: [{ frame: 3, name: 'hit' }],
				},
			},
			res: {
				idle: { x: 4, y: 5, w: 16, h: 18 },
				attack: { x: 24, y: 5, w: 20, h: 22 },
				after: { x: 48, y: 5, w: 14, h: 16 },
			},
		},
		new Texture(),
	);
}

describe('MovieClipDataFactory', () => {
	it('parses Egret MC data into expanded frames with atlas regions, offsets, labels, and events', () => {
		const data = createFactory().generateMovieClipData('hero')!;

		expect(data.frameRate).toBe(20);
		expect(data.frameCount).toBe(4);
		expect(data.getFrame(0)?.duration).toBe(50);
		expect(data.getFrame(0)?.texture).toBe(data.getFrame(1)?.texture);
		expect(data.getFrame(0)?.texture).toMatchObject({
			bitmapX: 4,
			bitmapY: 5,
			bitmapWidth: 16,
			bitmapHeight: 18,
			offsetX: -2,
			offsetY: 3,
			textureWidth: 16,
			textureHeight: 18,
		});
		expect(data.getFrame(2)?.texture).toMatchObject({
			bitmapWidth: 20,
			bitmapHeight: 22,
			offsetX: 1,
			offsetY: -1,
			textureWidth: 20,
			textureHeight: 22,
		});
		expect(data.getFrameLabelRange('attack')).toEqual({ name: 'attack', startFrame: 2, endFrame: 3 });
		expect(data.getFrame(2)?.event).toBe('hit');
	});

	it('allows projects to replace the Egret frame texture conversion rule', () => {
		const customTexture = new Texture();
		const createFrameTexture = vi.fn(() => customTexture);
		const factory = new MovieClipDataFactory(undefined, undefined, { createFrameTexture });

		factory.mcDataSet = createFactory().mcDataSet;
		factory.texture = new Texture();
		const data = factory.generateMovieClipData('hero')!;

		expect(createFrameTexture).toHaveBeenCalledWith(
			factory.spriteSheet,
			expect.objectContaining({
				name: 'hero:0:idle',
				bitmapWidth: 16,
				bitmapHeight: 18,
				offsetX: -2,
				offsetY: 3,
			}),
		);
		expect(data.getFrame(0)?.texture).toBe(customTexture);
	});

	it('uses label ranges when MovieClip plays a named Egret label', () => {
		const data = createFactory().generateMovieClipData('hero')!;
		const clip = new MovieClip(data);
		const loops = vi.fn();
		const hits = vi.fn();
		clip.addEventListener(MovieClipEvent.LOOP_COMPLETE, loops);
		clip.addEventListener('hit', hits);

		clip.gotoAndPlay('attack', -1);
		expect(clip.currentFrame).toBe(3);
		expect(hits).toHaveBeenCalledTimes(1);

		clip.advanceFrame();
		expect(clip.currentFrame).toBe(4);
		expect(loops).not.toHaveBeenCalled();

		clip.advanceFrame();
		expect(clip.currentFrame).toBe(3);
		expect(loops).toHaveBeenCalledTimes(1);
		expect(hits).toHaveBeenCalledTimes(2);
	});

	it('caches generated data by default and supports cache invalidation', () => {
		const factory = createFactory();
		const first = factory.generateMovieClipData('hero');
		const second = factory.generateMovieClipData('hero');
		expect(first).toBe(second);

		factory.clearCache();
		const third = factory.generateMovieClipData('hero');
		expect(third).not.toBe(first);

		factory.enableCache = false;
		expect(factory.generateMovieClipData('hero')).not.toBe(factory.generateMovieClipData('hero'));
	});

	it('selects the first clip by default and returns undefined for unknown clips', () => {
		const factory = createFactory();

		expect(factory.generateMovieClipData()).toBeDefined();
		expect(factory.generateMovieClipData('missing')).toBeUndefined();
	});

	it('rejects invalid Egret frame duration and label/event frame references', () => {
		const atlas = new Texture();
		const invalidDuration = new MovieClipDataFactory({ mc: { bad: { frames: [{ duration: 0 }] } } }, atlas);
		expect(() => invalidDuration.generateMovieClipData('bad')).toThrow(RangeError);

		const invalidLabel = new MovieClipDataFactory(
			{ mc: { bad: { frames: [{}], labels: [{ name: 'bad', frame: 2 }] } } },
			atlas,
		);
		expect(() => invalidLabel.generateMovieClipData('bad')).toThrow(RangeError);
	});
});
