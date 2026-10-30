import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveResourceUrl } from '../src/kurot/net/resource-url.js';
import { HttpRequest } from '../src/kurot/net/HttpRequest.js';
import { HttpMethod } from '../src/kurot/net/HttpMethod.js';
import { ImageLoader } from '../src/kurot/net/ImageLoader.js';

const version = '261030123456';
const origin = window.location.origin;

beforeEach(() => {
	document.head.innerHTML = `<base href="/game/"><meta name="kurot-resource-version" content="${version}">`;
});

afterEach(() => {
	vi.unstubAllGlobals();
	document.head.innerHTML = '';
});

describe('release resource URLs', () => {
	it.each([
		'resource/default.res.json', 'resource/default.thm.json',
		'resource/ui/atlas.json', 'resource/ui/atlas.png', 'resource/font.fnt',
		'resource/font.png', 'resource/music.mp3', 'resource/movie.mp4',
		'resource/skeleton.json', 'resource/skeleton.atlas', 'resource/fonts/text.ttf',
	])('versions %s before Player creation', input => {
		expect(resolveResourceUrl(input)).toBe(`${origin}/game/${input}?v=${version}`);
	});

	it('preserves query fields and fragments, replaces v and is idempotent', () => {
		const first = resolveResourceUrl('resource/atlas.png?size=2&v=old#frame');
		expect(first).toBe(`${origin}/game/resource/atlas.png?size=2&v=${version}#frame`);
		expect(resolveResourceUrl(first)).toBe(first);
	});

	it('supports URL objects and same-origin absolute paths', () => {
		const input = new URL('/game/resource/a%20b.png', origin);
		expect(resolveResourceUrl(input)).toBe(`${input.href}?v=${version}`);
	});

	it.each([
		'', '#frame', 'resource/', 'resource/../api/user', '/api/user?auth=fixture',
		'js/main.min_ABC.js', 'resource/plugin.mjs', 'resourceful/file.png',
		'https://cdn.example/resource/image.png?signature=fixture',
		'//cdn.example/resource/image.png', 'data:image/png;base64,AA', 'blob:fixture',
	])('preserves URLs outside the local resource contract: %s', input => {
		expect(resolveResourceUrl(input)).toBe(input);
	});

	it('preserves development URLs without metadata and supports non-browser hosts', () => {
		document.querySelector('meta')?.remove();
		expect(resolveResourceUrl('resource/a.png')).toBe('resource/a.png');
		vi.stubGlobal('document', undefined);
		expect(resolveResourceUrl('resource/a.png')).toBe('resource/a.png');
	});

	it('does not version an external base origin', () => {
		document.querySelector('base')?.setAttribute('href', 'https://cdn.example/game/');
		expect(resolveResourceUrl('resource/a.png')).toBe('resource/a.png');
	});

	it('versions actual GET transport URLs without mutating POST requests', () => {
		const xhr = { open: vi.fn(), send: vi.fn(), abort: vi.fn() };
		vi.stubGlobal('XMLHttpRequest', vi.fn(function createRequest() {
			return xhr;
		}));
		const request = new HttpRequest();
		request.open('resource/atlas.json');
		request.send();
		expect(xhr.open).toHaveBeenLastCalledWith('GET', `${origin}/game/resource/atlas.json?v=${version}`, true);
		request.open('resource/action', HttpMethod.POST);
		request.send();
		expect(xhr.open).toHaveBeenLastCalledWith('POST', 'resource/action', true);
	});

	it('versions the independently requested atlas/font image page', () => {
		const images: FakeImage[] = [];
		class FakeImage {
			public src = '';
			public onload: (() => void) | null = null;
			public onerror: (() => void) | null = null;
			public constructor() {
				images.push(this);
			}
		}
		vi.stubGlobal('Image', FakeImage);
		const descriptor = resolveResourceUrl('resource/atlas.json');
		const page = new URL('atlas.png', descriptor).href;
		new ImageLoader().load(page);
		expect(images[0]?.src).toBe(`${origin}/game/resource/atlas.png?v=${version}`);
	});
});
