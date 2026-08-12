import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Resource } from '../src/blakron/resource/Resource.js';
import { AnalyzerBase } from '../src/blakron/resource/analyzers/AnalyzerBase.js';
import { ResourceItem } from '../src/blakron/resource/ResourceItem.js';
import { ResourceConfig } from '../src/blakron/resource/ResourceConfig.js';

/**
 * Minimal fake XHR — same shape as HttpRequest.test.ts — used so
 * `Resource.loadConfig()` can "fetch" a config document without a real
 * network stack.
 */
class FakeXHR {
	public status = 0;
	public response: unknown;
	public responseType = '';
	public withCredentials = false;
	public timeout = 0;
	public onload: (() => void) | null = null;
	public onerror: (() => void) | null = null;
	public ontimeout: (() => void) | null = null;
	public onprogress: ((e: { loaded: number; total: number }) => void) | null = null;

	public open = vi.fn();
	public send = vi.fn(() => {
		// Respond synchronously-ish (next microtask) like a resolved fetch.
		this.status = 200;
		if (this.response === undefined) {
			this.response = CONFIG_JSON;
		}
		queueMicrotask(() => this.onload?.());
	});
	public abort = vi.fn();
	public getAllResponseHeaders = vi.fn(() => '');
	public setRequestHeader = vi.fn();
	public getResponseHeader = vi.fn(() => '');
}

let fakeXhr: FakeXHR;

const CONFIG_JSON = JSON.stringify({
	resources: [
		{ name: 'a1', type: 'mock', url: 'a1.bin' },
		{ name: 'a2', type: 'mock', url: 'a2.bin' },
		{ name: 'b1', type: 'mock', url: 'b1.bin' },
		{ name: 'b2', type: 'mock', url: 'b2.bin' },
	],
	groups: [
		{ name: 'groupA', keys: 'a1,a2' },
		{ name: 'groupB', keys: 'b1,b2' },
		// Overlaps with groupA on 'a1' — used to test that concurrent loadGroup()
		// calls for overlapping groups don't double-load the shared item.
		{ name: 'groupC', keys: 'a1,b1' },
	],
});

/** Records the name of each item as it finishes loading, in completion order. */
class OrderTrackingAnalyzer extends AnalyzerBase {
	public constructor(
		private readonly order: string[],
		private readonly shouldFail: (name: string) => boolean = () => false,
	) {
		super();
	}

	public loadFile(item: ResourceItem): Promise<ResourceItem> {
		return new Promise<ResourceItem>(resolve => {
			setTimeout(() => {
				item.loaded = !this.shouldFail(item.name);
				this.order.push(item.name);
				if (item.loaded) this.fileDic.set(item.name, { name: item.name });
				resolve(item);
			}, 0);
		});
	}
}

class SubkeyTrackingAnalyzer extends AnalyzerBase {
	public readonly loadNames: string[] = [];
	private readonly aliases = new Map<string, unknown>();

	public async loadFile(item: ResourceItem): Promise<ResourceItem> {
		this.loadNames.push(item.name);
		const sheet = { name: item.name };
		this.fileDic.set(item.name, sheet);
		this.aliases.set('button_up_png', { sheet });
		item.loaded = true;
		return item;
	}

	public override getRes<T = unknown>(name: string): T | undefined {
		return (this.fileDic.get(name) ?? this.aliases.get(name)) as T | undefined;
	}

	public override hasRes(name: string): boolean {
		return this.fileDic.has(name) || this.aliases.has(name);
	}

	public override destroyRes(name: string): boolean {
		if (!this.fileDic.has(name)) return false;
		this.fileDic.delete(name);
		this.aliases.clear();
		return true;
	}
}

beforeEach(() => {
	fakeXhr = new FakeXHR();
	vi.stubGlobal(
		'XMLHttpRequest',
		vi.fn(function XMLHttpRequestMock() {
			return fakeXhr;
		}),
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('Resource.loadGroup concurrency', () => {
	it('queues concurrent loadGroup() calls instead of letting one overwrite the other', async () => {
		const resource = new Resource();
		const order: string[] = [];
		resource.registerAnalyzer('mock', new OrderTrackingAnalyzer(order));

		await resource.loadConfig('resource.json');

		// Fire both group loads back-to-back, without awaiting the first.
		// Before the fix this would silently replace groupA's queue/callbacks
		// with groupB's, leaving groupA's promise pending forever.
		const p1 = resource.loadGroup('groupA');
		const p2 = resource.loadGroup('groupB');

		await expect(Promise.all([p1, p2])).resolves.toEqual([undefined, undefined]);

		// groupA's items must fully finish before any groupB item starts,
		// proving the batches ran serially rather than racing on shared state.
		expect(new Set(order.slice(0, 2))).toEqual(new Set(['a1', 'a2']));
		expect(new Set(order.slice(2, 4))).toEqual(new Set(['b1', 'b2']));

		expect(resource.hasRes('a1')).toBe(true);
		expect(resource.hasRes('a2')).toBe(true);
		expect(resource.hasRes('b1')).toBe(true);
		expect(resource.hasRes('b2')).toBe(true);
	});

	it('a failing group does not block a subsequently queued group from loading', async () => {
		const resource = new Resource();
		const order: string[] = [];
		// groupA's items always fail; groupB's always succeed.
		resource.registerAnalyzer('mock', new OrderTrackingAnalyzer(order, name => name.startsWith('a')));

		await resource.loadConfig('resource.json');

		const p1 = resource.loadGroup('groupA');
		const p2 = resource.loadGroup('groupB');

		const results = await Promise.allSettled([p1, p2]);
		expect(results[0].status).toBe('rejected');
		expect(results[1].status).toBe('fulfilled');

		expect(resource.hasRes('a1')).toBe(false);
		expect(resource.hasRes('b1')).toBe(true);
		expect(resource.hasRes('b2')).toBe(true);
	});

	it('loading the same group twice after completion resolves immediately without reloading', async () => {
		const resource = new Resource();
		const order: string[] = [];
		resource.registerAnalyzer('mock', new OrderTrackingAnalyzer(order));

		await resource.loadConfig('resource.json');
		await resource.loadGroup('groupA');
		expect(order).toEqual(['a1', 'a2']);

		await resource.loadGroup('groupA');
		// No new items should have been dispatched to the analyzer.
		expect(order).toEqual(['a1', 'a2']);
	});

	it('concurrently loading two groups that share a resource loads the shared item only once', async () => {
		// groupA = [a1, a2], groupC = [a1, b1] — 'a1' is shared. Both calls are
		// fired before either has a chance to finish, so the naive "compute
		// toLoad once, at call time" approach would have both batches decide
		// 'a1' is still unloaded and dispatch it twice.
		const resource = new Resource();
		const order: string[] = [];
		resource.registerAnalyzer('mock', new OrderTrackingAnalyzer(order));

		await resource.loadConfig('resource.json');

		const p1 = resource.loadGroup('groupA');
		const p2 = resource.loadGroup('groupC');

		await Promise.all([p1, p2]);

		// 'a1' must appear exactly once across both batches combined.
		expect(order.filter(name => name === 'a1')).toHaveLength(1);
		expect(resource.hasRes('a1')).toBe(true);
		expect(resource.hasRes('a2')).toBe(true);
		expect(resource.hasRes('b1')).toBe(true);
	});
});

describe('Resource sheet subkeys', () => {
	it('trims subkeys and ignores empty entries when indexing a config', () => {
		const config = new ResourceConfig();
		config.parseConfig(
			{
				resources: [
					{
						name: 'eui',
						type: 'sheet',
						url: 'eui.json',
						subkeys: ' button_up_png, ,button_down_png ',
					},
				],
				groups: [],
			},
			'',
		);

		expect(config.getResourceItem('button_up_png')?.name).toBe('eui');
		expect(config.getResourceItem('button_down_png')?.name).toBe('eui');
		expect(config.hasKey('')).toBe(false);
	});

	it('tracks the parent sheet when loading by subkey', async () => {
		const resource = new Resource();
		const analyzer = new SubkeyTrackingAnalyzer();
		resource.registerAnalyzer('mock-sheet', analyzer);

		fakeXhr.response = JSON.stringify({
			resources: [
				{
					name: 'eui',
					type: 'mock-sheet',
					url: 'eui.json',
					subkeys: 'button_up_png',
				},
			],
			groups: [{ name: 'preload', keys: 'eui' }],
		});

		await resource.loadConfig('resource.json');
		await expect(resource.load('button_up_png')).resolves.toBeDefined();
		expect(analyzer.loadNames).toEqual(['eui']);

		await resource.loadGroup('preload');
		expect(analyzer.loadNames).toEqual(['eui']);

		resource.destroyAll();
		expect(resource.hasRes('eui')).toBe(false);
		expect(resource.hasRes('button_up_png')).toBe(false);
	});
});
