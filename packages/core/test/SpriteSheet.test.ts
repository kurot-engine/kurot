import { describe, it, expect, vi } from 'vitest';
import { SpriteSheet } from '../src/blakron/display/texture/SpriteSheet.js';
import { Texture } from '../src/blakron/display/texture/Texture.js';
import { BitmapData } from '../src/blakron/display/texture/BitmapData.js';

function makeSourceTexture(): Texture {
	const bd = new BitmapData();
	bd.width = 512;
	bd.height = 512;

	const tex = new Texture();
	tex.bitmapData = bd;
	tex.initData(0, 0, 512, 512, 0, 0, 512, 512, 512, 512);
	return tex;
}

describe('SpriteSheet', () => {
	it('constructor takes a Texture', () => {
		expect(new SpriteSheet(makeSourceTexture())).toBeInstanceOf(SpriteSheet);
	});

	it('getTexture returns undefined before creation', () => {
		const sheet = new SpriteSheet(makeSourceTexture());
		expect(sheet.getTexture('hero')).toBeUndefined();
	});

	it('createTexture creates and stores a sub-texture', () => {
		const sheet = new SpriteSheet(makeSourceTexture());
		const sub = sheet.createTexture('hero', 100, 200, 64, 64);
		expect(sub).toBeInstanceOf(Texture);
		expect(sheet.getTexture('hero')).toBe(sub);
	});

	it('createTexture shares bitmapData with source', () => {
		const tex = makeSourceTexture();
		const sheet = new SpriteSheet(tex);
		const sub = sheet.createTexture('icon', 50, 50, 32, 32);
		expect(sub.bitmapData).toBe(tex.bitmapData);
		expect(sub.disposeBitmapData).toBe(false);
	});

	it('createTexture preserves offset values', () => {
		const sheet = new SpriteSheet(makeSourceTexture());
		const sub = sheet.createTexture('a', 100, 200, 50, 50, 5, 5);
		expect(sub.offsetX).toBe(5);
		expect(sub.offsetY).toBe(5);
	});

	it('createTexture with custom textureWidth/textureHeight', () => {
		const sheet = new SpriteSheet(makeSourceTexture());
		const sub = sheet.createTexture('big', 0, 0, 100, 100, 0, 0, 200, 200);
		expect(sub.textureWidth).toBe(200);
		expect(sub.textureHeight).toBe(200);
	});

	it('createTexture default size = offset + bitmap dimensions', () => {
		const sheet = new SpriteSheet(makeSourceTexture());
		const sub = sheet.createTexture('t', 10, 20, 80, 90, 5, 5);
		expect(sub.textureWidth).toBe(85);
		expect(sub.textureHeight).toBe(95);
	});

	it('createTexture inherits sourceWidth/sourceHeight from parent', () => {
		const sheet = new SpriteSheet(makeSourceTexture());
		const sub = sheet.createTexture('s', 0, 0, 64, 64);
		expect(sub.sourceWidth).toBe(512);
		expect(sub.sourceHeight).toBe(512);
	});

	it('createTexture overwrites by name', () => {
		const sheet = new SpriteSheet(makeSourceTexture());
		sheet.createTexture('dup', 0, 0, 32, 32);
		const sub2 = sheet.createTexture('dup', 100, 100, 64, 64);
		expect(sheet.getTexture('dup')).toBe(sub2);
	});

	it('dispose calls source texture dispose', () => {
		const tex = makeSourceTexture();
		let disposed = false;
		tex.dispose = () => {
			disposed = true;
		};
		const sheet = new SpriteSheet(tex);
		sheet.dispose();
		expect(disposed).toBe(true);
	});
});
