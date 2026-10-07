import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BitmapFont, BitmapData, Texture, Resource, ResourceItem, ResourceType } from '../src/index.js';
import { TextAnalyzer } from '../src/kurot/resource/analyzers/TextAnalyzer.js';
import { ImageAnalyzer } from '../src/kurot/resource/analyzers/ImageAnalyzer.js';
import { FontAnalyzer } from '../src/kurot/resource/analyzers/FontAnalyzer.js';

const descriptor = { file: '../images/font page.png', frames: { A: { x: 0, y: 0, w: 4, h: 8 } } };
let textResponse: unknown;
let imageLoaded: boolean;
let page: Texture;
let urls: string[];
function cache(analyzer: TextAnalyzer | ImageAnalyzer): Map<string, unknown> {
	return (analyzer as unknown as { fileDic: Map<string, unknown> }).fileDic;
}

beforeEach(() => {
	document.head.innerHTML = '<base href="https://example.test/game/">';
	textResponse = JSON.stringify(descriptor);
	imageLoaded = true;
	urls = [];
	const canvas = document.createElement('canvas');
	canvas.width = 32;
	canvas.height = 32;
	page = new Texture();
	page.setBitmapData(new BitmapData(canvas));
	vi.spyOn(TextAnalyzer.prototype, 'loadFile').mockImplementation(async function (this: TextAnalyzer, item: ResourceItem): Promise<ResourceItem> {
		cache(this).set(item.name, textResponse);
		item.loaded = true;
		return item;
	});
	vi.spyOn(ImageAnalyzer.prototype, 'loadFile').mockImplementation(async function (this: ImageAnalyzer, item: ResourceItem): Promise<ResourceItem> {
		urls.push(item.url);
		item.loaded = imageLoaded;
		if (imageLoaded) {
			cache(this).set(item.name, page);
		}
		return item;
	});
});
afterEach(() => {
	vi.restoreAllMocks();
	document.head.innerHTML = '';
});

describe('font resource loading', () => {
	it('registers font by default and resolves page paths relative to the descriptor URL', async () => {
		const resource = new Resource();
		resource.addResource({ name: 'font', url: 'assets/fonts/number.fnt?revision=2', type: ResourceType.Font });
		const font = await resource.load<BitmapFont>('font');
		expect(font).toBeInstanceOf(BitmapFont);
		expect(urls).toEqual(['https://example.test/game/assets/images/font%20page.png']);
		expect(resource.get('font')).toBe(font);
		expect(await resource.load('font')).toBe(font);
	});
	it('deduplicates concurrent requests and frees the owned page once', async () => {
		const analyzer = new FontAnalyzer();
		const items = [new ResourceItem('font', 'assets/font.fnt', 'font'), new ResourceItem('font', 'assets/font.fnt', 'font')];
		await Promise.all(items.map(item => analyzer.loadFile(item)));
		expect(items.every(item => item.loaded)).toBe(true);
		expect(urls).toHaveLength(1);
		const dispose = vi.spyOn(page, 'dispose');
		expect(analyzer.destroyRes('font')).toBe(true);
		expect(analyzer.destroyRes('font')).toBe(false);
		expect(dispose).toHaveBeenCalledOnce();
		expect(analyzer.getRes('font')).toBeUndefined();
	});
	it('rejects malformed descriptors before requesting their image', async () => {
		textResponse = '{bad json';
		const analyzer = new FontAnalyzer();
		const item = new ResourceItem('font', 'assets/font.fnt', 'font');
		await analyzer.loadFile(item);
		expect(item.loaded).toBe(false);
		expect(urls).toHaveLength(0);
		textResponse = JSON.stringify(descriptor);
		await analyzer.loadFile(item);
		expect(item.loaded).toBe(true);
	});
	it('cleans up a failed image and supports retry', async () => {
		imageLoaded = false;
		const analyzer = new FontAnalyzer();
		const item = new ResourceItem('font', 'assets/font.fnt', 'font');
		await analyzer.loadFile(item);
		expect(item.loaded).toBe(false);
		imageLoaded = true;
		await analyzer.loadFile(item);
		expect(item.loaded).toBe(true);
	});
	it('disposes the page if glyph validation fails after loading', async () => {
		textResponse = JSON.stringify({ ...descriptor, frames: { A: { x: 32, y: 0, w: 8, h: 8 } } });
		const dispose = vi.spyOn(page, 'dispose');
		const analyzer = new FontAnalyzer();
		const item = new ResourceItem('font', 'assets/font.fnt', 'font');
		await analyzer.loadFile(item);
		expect(item.loaded).toBe(false);
		expect(dispose).toHaveBeenCalledOnce();
	});
});
