import { describe, it, expect } from 'vitest';
import { ResourceLoader } from '../src/blakron/resource/ResourceLoader.js';
import { ResourceItem } from '../src/blakron/resource/ResourceItem.js';
import { AnalyzerBase } from '../src/blakron/resource/analyzers/AnalyzerBase.js';

/** Analyzer that always resolves with loaded=true. */
class OkAnalyzer extends AnalyzerBase {
	public loadFile(item: ResourceItem): Promise<ResourceItem> {
		item.loaded = true;
		return Promise.resolve(item);
	}
}

/** Analyzer that always resolves with loaded=false (simulating a failed fetch). */
class FailAnalyzer extends AnalyzerBase {
	public loadFile(item: ResourceItem): Promise<ResourceItem> {
		item.loaded = false;
		return Promise.resolve(item);
	}
}

/** Analyzer whose loadFile promise rejects (simulating a thrown/network error). */
class ThrowAnalyzer extends AnalyzerBase {
	public loadFile(_item: ResourceItem): Promise<ResourceItem> {
		return Promise.reject(new Error('boom'));
	}
}

/**
 * Analyzer that throws SYNCHRONOUSLY before returning a Promise — distinct
 * from ThrowAnalyzer above, which rejects asynchronously. A synchronous throw
 * happens on the `analyzer.loadFile(item)` call expression itself, so there
 * is no Promise yet for `.catch()` to attach to.
 */
class SyncThrowAnalyzer extends AnalyzerBase {
	public loadFile(_item: ResourceItem): Promise<ResourceItem> {
		throw new Error('sync boom');
	}
}

describe('ResourceLoader', () => {
	it('resolves start() when all items load successfully', async () => {
		const loader = new ResourceLoader();
		loader.registerAnalyzer('ok', new OkAnalyzer());
		loader.loadResourceList([new ResourceItem('a', 'a.png', 'ok'), new ResourceItem('b', 'b.png', 'ok')]);

		let completed = 0;
		loader.onComplete = () => completed++;

		await loader.start();
		expect(completed).toBe(2);
	});

	it('retries a failing item up to retryCount then reports error, and start() still resolves', async () => {
		const loader = new ResourceLoader();
		loader.retryCount = 1;
		loader.registerAnalyzer('fail', new FailAnalyzer());
		loader.loadResourceList([new ResourceItem('a', 'a.png', 'fail')]);

		let errored = 0;
		loader.onError = () => errored++;

		await loader.start();
		expect(errored).toBe(1);
	});

	it('an item with no registered analyzer fails without hanging start()', async () => {
		const loader = new ResourceLoader();
		loader.retryCount = 0;
		// No analyzer registered for type 'missing'.
		loader.loadResourceList([new ResourceItem('a', 'a.png', 'missing')]);

		let errored = 0;
		loader.onError = () => errored++;

		await loader.start();
		expect(errored).toBe(1);
	});

	it('a rejected loadFile promise is treated as failure without hanging start()', async () => {
		const loader = new ResourceLoader();
		loader.retryCount = 0;
		loader.registerAnalyzer('throw', new ThrowAnalyzer());
		loader.loadResourceList([new ResourceItem('a', 'a.png', 'throw')]);

		let errored = 0;
		loader.onError = () => errored++;

		await loader.start();
		expect(errored).toBe(1);
	});

	it('a loadFile that throws synchronously (before returning a Promise) does not hang start()', async () => {
		const loader = new ResourceLoader();
		loader.retryCount = 0;
		loader.registerAnalyzer('syncThrow', new SyncThrowAnalyzer());
		loader.loadResourceList([new ResourceItem('a', 'a.png', 'syncThrow')]);

		let errored = 0;
		loader.onError = () => errored++;

		await loader.start();
		expect(errored).toBe(1);
	});

	it('a synchronous throw does not prevent subsequent queued items in the same tick from loading', async () => {
		// Regression guard: without the try/catch, a synchronous throw from one
		// item propagates out of loadItem() and skips the rest of next()'s
		// while-loop for that tick, leaving later items un-started.
		const loader = new ResourceLoader();
		loader.retryCount = 0;
		loader.threadCount = 4;
		loader.registerAnalyzer('ok', new OkAnalyzer());
		loader.registerAnalyzer('syncThrow', new SyncThrowAnalyzer());

		loader.loadResourceList([
			new ResourceItem('a', 'a.png', 'syncThrow'),
			new ResourceItem('b', 'b.png', 'ok'),
			new ResourceItem('c', 'c.png', 'ok'),
		]);

		let completed = 0;
		let errored = 0;
		loader.onComplete = () => completed++;
		loader.onError = () => errored++;

		await loader.start();
		expect(errored).toBe(1);
		expect(completed).toBe(2);
	});

	it('mixed success/failure/no-analyzer items all resolve start() exactly once with correct counts', async () => {
		const loader = new ResourceLoader();
		loader.retryCount = 0;
		loader.threadCount = 2;
		loader.registerAnalyzer('ok', new OkAnalyzer());
		loader.registerAnalyzer('fail', new FailAnalyzer());
		loader.registerAnalyzer('throw', new ThrowAnalyzer());

		loader.loadResourceList([
			new ResourceItem('a', 'a.png', 'ok'),
			new ResourceItem('b', 'b.png', 'fail'),
			new ResourceItem('c', 'c.png', 'missing'),
			new ResourceItem('d', 'd.png', 'throw'),
			new ResourceItem('e', 'e.png', 'ok'),
		]);

		let completed = 0;
		let errored = 0;
		loader.onComplete = () => completed++;
		loader.onError = () => errored++;

		await loader.start();
		expect(completed).toBe(2);
		expect(errored).toBe(3);
	});

	it('respects threadCount concurrency limit', async () => {
		const loader = new ResourceLoader();
		loader.threadCount = 2;

		let maxConcurrent = 0;
		let current = 0;

		class ConcurrencyTrackingAnalyzer extends AnalyzerBase {
			public loadFile(item: ResourceItem): Promise<ResourceItem> {
				current++;
				maxConcurrent = Math.max(maxConcurrent, current);
				return new Promise<ResourceItem>(resolve => {
					setTimeout(() => {
						current--;
						item.loaded = true;
						resolve(item);
					}, 0);
				});
			}
		}

		loader.registerAnalyzer('slow', new ConcurrencyTrackingAnalyzer());
		loader.loadResourceList(
			Array.from({ length: 6 }, (_, i) => new ResourceItem(`item${i}`, `item${i}.png`, 'slow')),
		);

		await loader.start();
		expect(maxConcurrent).toBeLessThanOrEqual(2);
	});

	it('reports stable monotonic completed/total progress', async () => {
		const loader = new ResourceLoader();
		loader.registerAnalyzer('ok', new OkAnalyzer());
		loader.loadResourceList([
			new ResourceItem('a', 'a.png', 'ok'),
			new ResourceItem('b', 'b.png', 'ok'),
			new ResourceItem('c', 'c.png', 'ok'),
		]);
		const progress: Array<[number, number]> = [];
		loader.onProgress = (loaded, total) => progress.push([loaded, total]);

		await loader.start();

		expect(progress).toEqual([[1, 3], [2, 3], [3, 3]]);
	});

	it('does not finish an item twice when a consumer callback throws', async () => {
		const loader = new ResourceLoader();
		loader.threadCount = 1;
		loader.registerAnalyzer('ok', new OkAnalyzer());
		loader.loadResourceList([
			new ResourceItem('a', 'a.png', 'ok'),
			new ResourceItem('b', 'b.png', 'ok'),
		]);
		let completed = 0;
		loader.onComplete = () => {
			completed++;
			throw new Error('consumer failure');
		};

		await loader.start();

		expect(completed).toBe(2);
	});
});
