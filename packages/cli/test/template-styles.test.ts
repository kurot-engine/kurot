import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const style = {
	schemaVersion: 1,
	fonts: {
		default: 'primary',
		families: {
			primary: {
				fallback: ['Arial', 'sans-serif'],
				faces: [
					{ url: 'fonts/Regular font.ttf', weight: 400 },
					{ url: 'fonts/Bold.ttf', weight: 700 },
				],
			},
		},
	},
	colors: { 'disabled-text': '#000000' },
};
const registered = vi.fn();
const faces: FakeFontFace[] = [];
const loadFace = vi.fn<(face: FakeFontFace) => Promise<FakeFontFace>>();

class FakeFontFace {
	public constructor(
		public readonly family: string,
		public readonly source: string,
		public readonly descriptors: { weight: string },
	) {
		faces.push(this);
	}

	public load(): Promise<FakeFontFace> {
		return loadFace(this);
	}
}

beforeEach(() => {
	vi.resetModules();
	registered.mockClear();
	faces.length = 0;
	loadFace.mockReset().mockImplementation(async face => face);
	vi.stubGlobal('document', { baseURI: 'https://game.test/project/', fonts: { add: registered } });
	vi.stubGlobal('FontFace', FakeFontFace);
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => ({ ok: true, json: async () => style })),
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('game template project styles', () => {
	it('waits for every font before publishing aliases, default family and numeric colors', async () => {
		const { StyleManager } = await import('../templates/game/src/StyleManager.js');
		const regular = deferred<FakeFontFace>();
		const bold = deferred<FakeFontFace>();
		loadFace.mockImplementationOnce(() => regular.promise).mockImplementationOnce(() => bold.promise);
		const loading = StyleManager.init();
		await vi.waitFor(() => expect(faces).toHaveLength(2));
		expect(() => StyleManager.fontFamily).toThrow('not initialized');
		expect(registered).not.toHaveBeenCalled();
		regular.resolve(faces[0]!);
		await Promise.resolve();
		expect(registered).not.toHaveBeenCalled();
		bold.resolve(faces[1]!);
		await loading;
		expect(registered.mock.calls.map(call => call[0])).toEqual(faces);
		expect(faces.map(face => face.descriptors.weight)).toEqual(['400', '700']);
		expect(faces[0]?.source).toBe('url("https://game.test/project/resource/fonts/Regular%20font.ttf")');
		expect(StyleManager.fontFamily).toBe('"kurot-primary", "Arial", sans-serif');
		expect(StyleManager.getColor('disabled-text')).toBe(0);
		expect(() => StyleManager.getColor('missing')).toThrow('Unknown project color');
	});

	it('retains the previous publication and avoids partial font registration after a face fails', async () => {
		const { StyleManager } = await import('../templates/game/src/StyleManager.js');
		await StyleManager.init();
		registered.mockClear();
		loadFace.mockImplementation(async face => {
			if (face.descriptors.weight === '700') {
				throw new Error('Invalid font');
			}
			return face;
		});
		await expect(StyleManager.init()).rejects.toThrow('Unable to load project font primary (700)');
		expect(registered).not.toHaveBeenCalled();
		expect(StyleManager.fontFamily).toBe('"kurot-primary", "Arial", sans-serif');
		expect(StyleManager.getColor('disabled-text')).toBe(0);
	});

	it('rejects missing or invalid configuration before loading fonts', async () => {
		const { StyleManager } = await import('../templates/game/src/StyleManager.js');
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ ok: false, status: 404 })),
		);
		await expect(StyleManager.init()).rejects.toThrow('resource/config/style.json: HTTP 404');
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ ok: true, json: async () => ({ ...style, colors: { bad: '#bad' } }) })),
		);
		await expect(StyleManager.init()).rejects.toThrow('style.colors.bad');
		expect(faces).toHaveLength(0);
		expect(registered).not.toHaveBeenCalled();
	});
});

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>(fulfill => {
		resolve = fulfill;
	});
	return { promise, resolve };
}
