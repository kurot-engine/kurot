import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageLoader } from '../src/blakron/net/ImageLoader.js';

class FakeImage {
	public crossOrigin: string | null = null;
	public onload: (() => void) | null = null;
	public onerror: (() => void) | null = null;
	public src = '';
}

let images: FakeImage[];

beforeEach(() => {
	images = [];
	vi.stubGlobal(
		'Image',
		vi.fn(function ImageMock() {
			const image = new FakeImage();
			images.push(image);
			return image;
		}),
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('ImageLoader', () => {
	it('cancels the active image before starting a replacement request', () => {
		const loader = new ImageLoader();

		loader.load('first.png');
		const first = images[0];
		loader.load('second.png');

		expect(first.onload).toBeNull();
		expect(first.onerror).toBeNull();
		expect(first.src).toBe('');
		expect(images[1].src).toBe('second.png');
	});

	it('cancels the active image when closed', () => {
		const loader = new ImageLoader();

		loader.load('sprite.png');
		const image = images[0];
		loader.close();

		expect(image.onload).toBeNull();
		expect(image.onerror).toBeNull();
		expect(image.src).toBe('');
	});
});
