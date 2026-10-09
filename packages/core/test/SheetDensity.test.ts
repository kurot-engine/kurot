import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BitmapData, Event, ResourceItem, SpriteSheet, Texture } from '../src/index.js';
import { HttpRequest } from '../src/kurot/net/HttpRequest.js';
import { ImageLoader } from '../src/kurot/net/ImageLoader.js';
import { SheetAnalyzer } from '../src/kurot/resource/analyzers/SheetAnalyzer.js';

let response: string;
let imageURLs: string[];
beforeEach(() => {
	imageURLs = [];
	vi.spyOn(HttpRequest.prototype, 'response', 'get').mockImplementation(() => response);
	vi.spyOn(HttpRequest.prototype, 'send').mockImplementation(function (this: HttpRequest): void {
		queueMicrotask(() => this.dispatchEventWith(Event.COMPLETE));
	});
	vi.spyOn(ImageLoader.prototype, 'load').mockImplementation(function (this: ImageLoader, url: string): void {
		imageURLs.push(url);
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = 512;
		this.data = new BitmapData(canvas);
		queueMicrotask(() => this.dispatchEventWith(Event.COMPLETE));
	});
});
afterEach(() => vi.restoreAllMocks());

describe('sheet density metadata', () => {
	it.each([undefined, 2])('loads density %s with physical atlas coordinates and logical trim bounds', async resolution => {
		response = JSON.stringify({ file: 'kui.png', resolution,
			frames: { button: { x: 80, y: 120, w: 72, h: 64, offX: 8, offY: 12, sourceW: 96, sourceH: 96 } } });
		const analyzer = new SheetAnalyzer();
		const item = new ResourceItem('kui', 'resource/assets/kui.json', 'sheet');
		await analyzer.loadFile(item);
		expect(item.loaded).toBe(true);
		expect(imageURLs).toEqual(['resource/assets/kui.png']);
		const texture = analyzer.getRes<Texture>('kui.button')!;
		expect(texture.resolution).toBe(resolution ?? 1);
		expect([texture.bitmapX, texture.bitmapY, texture.bitmapWidth, texture.bitmapHeight]).toEqual([80, 120, 72, 64]);
		expect(texture.textureWidth).toBe(96 / (resolution ?? 1));
		expect(texture.offsetX).toBe(8 / (resolution ?? 1));
		expect(analyzer.getRes('button')).toBe(texture);
		expect(analyzer.getRes<SpriteSheet>('kui')?.getTexture('button')).toBe(texture);
		expect(analyzer.destroyRes('kui')).toBe(true);
		expect(analyzer.getRes('kui.button')).toBeUndefined();
	});
	it.each([0, -1, '2', false, {}])('rejects invalid density %s before loading image pixels', async resolution => {
		response = JSON.stringify({ file: 'kui.png', frames: {}, resolution });
		const item = new ResourceItem('kui', 'kui.json', 'sheet');
		await new SheetAnalyzer().loadFile(item);
		expect(item.loaded).toBe(false);
		expect(imageURLs).toEqual([]);
	});
});
