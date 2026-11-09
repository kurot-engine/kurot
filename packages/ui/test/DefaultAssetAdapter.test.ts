import { describe, expect, it, vi } from 'vitest';
import { AnalyzerBase, Resource, ResourceItem, SpriteSheet, Texture } from '@kurot/core';
import { DefaultAssetAdapter } from '../src/index.js';

class Images extends AnalyzerBase {
	public readonly files: ResourceItem[] = [];
	public fail = false;

	public async loadFile(item: ResourceItem): Promise<ResourceItem> {
		this.files.push(item);
		item.loaded = !this.fail;
		if (item.loaded) {
			this.fileDic.set(item.name, new Texture());
		}
		return item;
	}
}

class Sheets extends AnalyzerBase {
	public readonly pages: string[] = [];
	public async loadFile(item: ResourceItem): Promise<ResourceItem> {
		this.pages.push(item.name);
		const sheet = new SpriteSheet(new Texture());
		for (const frame of ['hero', 'badge.png']) {
			this.fileDic.set(frame, sheet.createTexture(frame, 0, 0, 10, 10));
		}
		this.fileDic.set(item.name, sheet);
		item.loaded = true;
		return item;
	}
}

function request(adapter: DefaultAssetAdapter, source: string) {
	return new Promise<Texture | undefined>(resolve => {
		adapter.getAsset(source, (texture, original) => {
			expect(original).toBe(source);
			resolve(texture);
		});
	});
}

describe('DefaultAssetAdapter', () => {
	it('shares named and URL loads across adapters and Core; cache hits are synchronous', async () => {
		const provider = new Resource();
		const images = new Images();
		provider.registerAnalyzer('image', images);
		provider.addResource({ name: 'avatar', type: 'image', url: 'resource/artist.png' });
		const a = new DefaultAssetAdapter(provider);
		const b = new DefaultAssetAdapter(provider);
		for (const source of ['avatar', 'resource/head.png?v=1#face', 'https://cdn.test/42']) {
			const alternate = source === 'avatar' ? 'resource/artist.png' : source;
			const [first, second, direct] = await Promise.all([
				request(a, source), request(b, alternate), provider.loadSource(source, 'image'),
			]);
			expect(first).toBeInstanceOf(Texture);
			expect(second).toBe(first);
			expect(direct).toBe(first);
			expect(provider.get(source)).toBe(first);
			const settled = vi.fn();
			b.getAsset(source, settled);
			expect(settled).toHaveBeenCalledExactlyOnceWith(first, source);
		}
		expect(images.files.map(item => item.url)).toEqual([
			'resource/artist.png', 'resource/head.png?v=1#face', 'https://cdn.test/42',
		]);
		expect(provider.destroy('resource/artist.png')).toBe(true);
		expect(provider.get('avatar')).toBeUndefined();
		expect(provider.getResourceItem('resource/head.png?v=1#face')).toBeUndefined();
		expect(provider.destroy('resource/head.png?v=1#face')).toBe(true);
		expect(provider.get('resource/head.png?v=1#face')).toBeUndefined();
	});

	it('resolves declared and qualified frames through their sheet even before preload', async () => {
		const provider = new Resource();
		const sheets = new Sheets();
		provider.registerAnalyzer('sheet', sheets);
		const images = new Images();
		provider.registerAnalyzer('image', images);
		provider.addResource({ name: 'icons.ui', type: 'sheet', url: 'icons.json', subkeys: { hero: {}, 'badge.png': {} } });
		provider.addResource({ name: 'buttons', type: 'sheet', url: 'buttons.json', subkeys: { hero: {} } });
		const adapter = new DefaultAssetAdapter(provider);
		const [hero, same, badge, other] = await Promise.all([
			request(adapter, 'hero'), request(adapter, 'icons.ui.hero'), request(adapter, 'icons.ui.badge.png'),
			request(adapter, 'buttons.hero'),
		]);
		expect(hero).toBeInstanceOf(Texture);
		expect(same).toBe(hero);
		expect(other).toBeInstanceOf(Texture);
		expect(other).not.toBe(hero);
		expect(badge).toBe(provider.get('badge.png'));
		const hit = vi.fn();
		adapter.getAsset('icons.ui.badge.png', hit);
		expect(hit).toHaveBeenCalledExactlyOnceWith(badge, 'icons.ui.badge.png');
		expect(sheets.pages.sort()).toEqual(['buttons', 'icons.ui']);
		expect(await request(adapter, 'icons.ui.missing')).toBeUndefined();
		expect(await request(adapter, 'icons.ui')).toBeUndefined();
		expect(images.files).toEqual([]);
	});

	it.each(['portrait', 'avatar/7.png'])('finishes every waiter once on failure and retries %s from its proper URL', async source => {
		const provider = new Resource();
		const images = new Images();
		provider.registerAnalyzer('image', images);
		if (source === 'portrait') {
			provider.addResource({ name: source, type: 'image', url: 'actual.png' });
		}
		images.fail = true;
		const adapter = new DefaultAssetAdapter(provider);
		const replies = [vi.fn(), vi.fn()];
		await Promise.all(replies.map(reply => new Promise<void>(resolve => {
			adapter.getAsset(source, (texture, original) => {
				reply(texture, original);
				resolve();
			});
		})));
		for (const reply of replies) {
			expect(reply).toHaveBeenCalledExactlyOnceWith(undefined, source);
		}
		expect(provider.get(source)).toBeUndefined();
		images.fail = false;
		expect(await request(adapter, source)).toBeInstanceOf(Texture);
		expect(images.files.map(item => item.url)).toEqual(Array(2).fill(source === 'portrait' ? 'actual.png' : source));
	});

	it('keeps identically named textures isolated between application resources', async () => {
		const a = new Resource();
		const b = new Resource();
		for (const provider of [a, b]) {
			provider.registerAnalyzer('image', new Images());
		}
		const source = 'logo.png';
		const first = await request(new DefaultAssetAdapter(a), source);
		const second = await request(new DefaultAssetAdapter(b), source);
		expect(first).toBeInstanceOf(Texture);
		expect(second).not.toBe(first);
		a.destroyAll();
		expect(a.get(source)).toBeUndefined();
		expect(b.get(source)).toBe(second);
	});
});
