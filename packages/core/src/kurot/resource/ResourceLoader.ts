import type { ResourceItem } from './ResourceItem.js';
import type { AnalyzerBase } from './analyzers/AnalyzerBase.js';

/**
 * Queue-based resource loader with concurrency control.
 *
 * - Items are processed in priority order (higher priority first).
 * - Concurrency is limited to `threadCount` (default 2).
 * - Failed items are retried up to `retryCount` times (default 3).
 * - Progress is reported via the `onProgress` callback.
 */
export class ResourceLoader {
	// ── Instance fields ──────────────────────────────────────────────────────

	/**
	 * Maximum concurrent loads
	 */
	public threadCount = 2;
	/**
	 * Maximum retries for failed items
	 */
	public retryCount = 3;

	/**
	 * Called for each successfully loaded item
	 */
	public onComplete?: (item: ResourceItem) => void;
	/**
	 * Called for each failed item (after retries exhausted)
	 */
	public onError?: (item: ResourceItem) => void;
	/**
	 * Called with (loaded, total) progress
	 */
	public onProgress?: (loaded: number, total: number) => void;

	private pendingList: ResourceItem[] = [];
	private loadingList: ResourceItem[] = [];
	private retryDic: Map<string, number> = new Map<string, number>();
	private analyzerMap: Map<string, AnalyzerBase> = new Map<string, AnalyzerBase>();
	private generation = 0;
	private activeCount = 0;
	private totalCount = 0;
	private completedCount = 0;
	private flights = new WeakMap<AnalyzerBase, Map<string, Promise<ResourceItem>>>();

	// ── Public methods ─────────────────────────────────────────────────────────

	/**
	 * Register an analyzer for a resource type.
	 */
	public registerAnalyzer(type: string, analyzer: AnalyzerBase): void {
		this.analyzerMap.set(type, analyzer);
	}

	/**
	 * Load a single owning item without scheduling a batch. Concurrent callers
	 * of this loader share analyzer work by resource name, including batch loads.
	 * A settled request is removed before callers resume, so failures can retry.
	 */
	public loadFile(item: ResourceItem): Promise<ResourceItem> {
		const analyzer = this.analyzerMap.get(item.type);
		if (!analyzer) {
			return Promise.reject(new Error(`No analyzer registered for type "${item.type}".`));
		}
		let files = this.flights.get(analyzer);
		if (!files) {
			files = new Map();
			this.flights.set(analyzer, files);
		}
		let flight = files.get(item.name);
		if (!flight) {
			// Install before invoking even a synchronous or reentrant custom analyzer.
			const ownerFiles = files;
			let start!: () => void;
			const work = new Promise<ResourceItem>((resolve, reject) => {
				start = () => {
					try {
						resolve(analyzer.loadFile(item));
					} catch (error) {
						reject(error);
					}
				};
			});
			flight = work.finally(() => ownerFiles.delete(item.name));
			files.set(item.name, flight);
			start();
		}
		return flight.then(result => {
			item.loaded = result.loaded;
			return item;
		});
	}

	/**
	 * Enqueue items for loading. Does not start loading — call `start()` to begin.
	 */
	public loadResourceList(list: ResourceItem[]): void {
		this.pendingList = list.slice();
		this.loadingList = [];
		this.retryDic.clear();
		this.totalCount = list.length;
		this.completedCount = 0;
	}

	/**
	 * Start or resume loading. Returns a promise that resolves when all items are loaded.
	 */
	public start(): Promise<void> {
		return new Promise<void>(resolve => {
			this._resolve = resolve;
			this.next();
		});
	}

	/**
	 * Ends the current batch. In-flight analyzers may settle, but their results
	 * cannot advance, retry or notify a later batch.
	 */
	public abort(): void {
		this.generation++;
		this.flights = new WeakMap();
		this.pendingList = [];
		this.loadingList = [];
		this.activeCount = 0;
		if (this._resolve) {
			this._resolve();
			this._resolve = undefined;
		}
	}

	// ── Private methods ────────────────────────────────────────────────────

	private _resolve?: () => void;

	private next(): void {
		if (this.pendingList.length === 0 && this.activeCount === 0) {
			if (this._resolve) {
				this._resolve();
				this._resolve = undefined;
			}
			return;
		}

		while (this.activeCount < this.threadCount && this.pendingList.length > 0) {
			const item = this.pendingList.shift()!;
			this.loadingList.push(item);
			this.activeCount++;
			this.loadItem(item);
		}
	}

	private loadItem(item: ResourceItem): void {
		const generation = this.generation;
		this.loadFile(item).then(
			r => {
				this.finishItem(r, generation);
			},
			() => {
				if (generation !== this.generation) {
					return;
				}
				item.loaded = false;
				this.finishItem(item, generation);
			},
		);
	}

	private finishItem(item: ResourceItem, generation: number): void {
		if (generation !== this.generation) {
			return;
		}
		this.loadingList = this.loadingList.filter(i => i !== item);
		this.activeCount--;

		if (item.loaded) {
			this.onItemComplete(item, generation);
		} else {
			this.onItemError(item, generation);
		}
	}

	private onItemComplete(item: ResourceItem, generation: number): void {
		this.completedCount++;
		this.reportProgress();
		if (generation !== this.generation) {
			return;
		}

		this.safeNotify(() => this.onComplete?.(item));

		this.next();
	}

	private onItemError(item: ResourceItem, generation: number): void {
		const retries = this.retryDic.get(item.name) ?? 0;
		if (retries < this.retryCount) {
			this.retryDic.set(item.name, retries + 1);
			this.pendingList.push(item);
			this.next();
			return;
		}

		this.completedCount++;
		this.safeNotify(() => this.onError?.(item));
		if (generation !== this.generation) {
			return;
		}
		this.reportProgress();
		this.next();
	}

	private reportProgress(): void {
		this.safeNotify(() => this.onProgress?.(this.completedCount, this.totalCount));
	}

	private safeNotify(callback: () => void): void {
		try {
			callback();
		} catch {}
	}
}
