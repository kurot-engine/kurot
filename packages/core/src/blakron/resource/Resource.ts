import { ResourceItem, ResourceType } from './ResourceItem.js';
import { ResourceConfig, type ResourceConfigData, type ResourceConfigEntry } from './ResourceConfig.js';
import { ResourceLoader } from './ResourceLoader.js';
import { ResourceEventType, type ResourceEvent } from './ResourceEvent.js';
import { AnalyzerBase } from './analyzers/AnalyzerBase.js';
import { ImageAnalyzer } from './analyzers/ImageAnalyzer.js';
import { JsonAnalyzer } from './analyzers/JsonAnalyzer.js';
import { TextAnalyzer } from './analyzers/TextAnalyzer.js';
import { SoundAnalyzer } from './analyzers/SoundAnalyzer.js';
import { SheetAnalyzer } from './analyzers/SheetAnalyzer.js';
import { HttpRequest } from '../net/HttpRequest.js';
import { HttpResponseType } from '../net/HttpResponseType.js';
import { Event } from '../events/Event.js';
import { IOErrorEvent } from '../events/IOErrorEvent.js';

/**
 * Progress callback signature.
 */
export type ProgressCallback = (loaded: number, total: number) => void;

/**
 * Event listener callback signature.
 */
export type ResourceEventListener = (event: ResourceEvent) => void;

/**
 * Modern resource manager — async/await API, type-safe, module-based.
 *
 * @example
 * ```ts
 * import { resource } from '@blakron/core';
 *
 * await resource.loadConfig('resource.json', 'assets/');
 * await resource.loadGroup('preload');
 * const texture = resource.get<Texture>('bg.png');
 * ```
 */
export class Resource {
	// ── Instance fields ────────────────────────────────────────────────────────

	private config: ResourceConfig = new ResourceConfig();
	private loader: ResourceLoader = new ResourceLoader();
	private analyzerMap: Map<string, AnalyzerBase> = new Map<string, AnalyzerBase>();
	private eventListeners: Map<string, Set<ResourceEventListener>> = new Map<string, Set<ResourceEventListener>>();
	private loadedNames: Set<string> = new Set<string>();
	private groupLoadQueue: Promise<unknown> = Promise.resolve();

	// ── Constructor ──────────────────────────────────────────────────────────

	public constructor() {
		this.registerDefaultAnalyzers();
	}

	// ── Config ───────────────────────────────────────────────────────────────

	/**
	 * Load and parse a resource configuration file.
	 * @param url URL of the resource.json file
	 * @param folder Base URL prefix for resource files (default: '')
	 */
	public async loadConfig(url: string, folder = ''): Promise<void> {
		const data = await this.fetchConfig(url);
		this.config.parseConfig(data, folder);
		this.emit({
			type: ResourceEventType.CONFIG_COMPLETE,
			groupName: '',
			itemsLoaded: 0,
			itemsTotal: 0,
		});
	}

	/**
	 * Add a resource definition directly (without a config file).
	 */
	public addResource(def: { name: string; url: string; type: string }): void {
		this.config.addItem(def as ResourceConfigEntry);
	}

	// ── Group loading ────────────────────────────────────────────────────────

	/**
	 * Load all resources in a group. Returns a promise that resolves when done.
	 *
	 * `this.loader` is a single shared instance, so running two batches at once
	 * would let the second call's queue/callbacks silently replace the first's
	 * mid-flight. Concurrent calls (for the same or different groups) are
	 * therefore chained onto `groupLoadQueue` and run to completion one at a
	 * time; each call still gets its own promise that resolves/rejects
	 * independently once its turn comes up, and a failed batch doesn't block
	 * the ones queued after it.
	 *
	 * The already-loaded filter is recomputed once this call's turn actually
	 * starts (inside `run()`), not at call time — otherwise an
	 * already-queued, overlapping `loadGroup()` call could finish loading some
	 * of these items first, and a stale snapshot would re-load them anyway.
	 *
	 * @param groupName Name of the group to load
	 * @param priority Reserved for future prioritized loading; currently unused by `ResourceLoader`
	 * @param onProgress Optional progress callback
	 */
	public async loadGroup(groupName: string, priority = 0, onProgress?: ProgressCallback): Promise<void> {
		const items = this.config.getGroupByName(groupName);
		if (items.length === 0) {
			throw new Error(`Resource group "${groupName}" not found or is empty.`);
		}

		const run = (): Promise<void> => {
			const toLoad = items.filter(item => !this.isResourceLoaded(item.name));
			if (toLoad.length === 0) return Promise.resolve();
			return this.loadResourceList(toLoad, groupName, priority, onProgress);
		};

		const scheduled = this.groupLoadQueue.then(run, run);
		this.groupLoadQueue = scheduled.catch(() => undefined);
		return scheduled;
	}

	// ── Single resource loading ──────────────────────────────────────────────

	/**
	 * Load a single resource by name. Returns the cached data.
	 */
	public async load<T = unknown>(name: string): Promise<T> {
		// Check cache
		const cached = this.get<T>(name);
		if (cached !== undefined) return cached;

		const item = this.config.getResourceItem(name);
		if (!item) {
			throw new Error(`Resource "${name}" not found in config.`);
		}

		const analyzer = this.getAnalyzer(item.type);
		if (!analyzer) {
			throw new Error(`No analyzer registered for type "${item.type}".`);
		}

		const result = await analyzer.loadFile(item);
		if (!result.loaded) {
			throw new Error(`Failed to load resource "${name}" from "${item.url}".`);
		}

		// A subkey resolves to its owning resource item (for example a texture
		// name resolves to the parent sheet). Track that canonical item name so
		// destroyAll() later destroys the complete resource instead of only the
		// requested sub-resource.
		this.loadedNames.add(item.name);
		return this.get<T>(name)!;
	}

	// ── Cache access ─────────────────────────────────────────────────────────

	/**
	 * Get a cached resource synchronously. Returns undefined if not loaded.
	 */
	public get<T = unknown>(name: string): T | undefined {
		// Try each analyzer
		for (const analyzer of this.analyzerMap.values()) {
			const data = analyzer.getRes<T>(name);
			if (data !== undefined) return data;
		}
		return undefined;
	}

	/**
	 * Check if a resource is loaded and cached.
	 */
	public hasRes(name: string): boolean {
		for (const analyzer of this.analyzerMap.values()) {
			if (analyzer.hasRes(name)) return true;
		}
		return false;
	}

	/**
	 * Check if a group exists in the config.
	 */
	public hasGroup(name: string): boolean {
		return this.config.hasGroup(name);
	}

	/**
	 * Get all group names.
	 */
	public getGroupNames(): string[] {
		return this.config.getGroupNames();
	}

	// ── Resource destruction ─────────────────────────────────────────────────

	/**
	 * Destroy a single cached resource by name.
	 */
	public destroy(name: string): boolean {
		for (const analyzer of this.analyzerMap.values()) {
			if (analyzer.destroyRes(name)) {
				this.loadedNames.delete(name);
				return true;
			}
		}
		return false;
	}

	/**
	 * Destroy all resources in a group.
	 */
	public destroyGroup(groupName: string): void {
		const items = this.config.getGroupByName(groupName);
		for (const item of items) {
			this.destroy(item.name);
		}
	}

	/**
	 * Destroy all cached resources.
	 */
	public destroyAll(): void {
		const names = Array.from(this.loadedNames);
		for (const name of names) {
			this.destroy(name);
		}
		this.loadedNames.clear();
	}

	// ── Events ───────────────────────────────────────────────────────────────

	/**
	 * Listen for resource events.
	 */
	public on(type: ResourceEventType, listener: ResourceEventListener): void {
		let set = this.eventListeners.get(type);
		if (!set) {
			set = new Set<ResourceEventListener>();
			this.eventListeners.set(type, set);
		}
		set.add(listener);
	}

	/**
	 * Remove an event listener.
	 */
	public off(type: ResourceEventType, listener: ResourceEventListener): void {
		const set = this.eventListeners.get(type);
		if (set) {
			set.delete(listener);
		}
	}

	/**
	 * Listen for loading progress on the next loadGroup/load call.
	 * Convenience method — shorthand for on(ResourceEventType.GROUP_PROGRESS, ...).
	 */
	public onProgress(callback: ProgressCallback): void {
		this.on(ResourceEventType.GROUP_PROGRESS, event => {
			callback(event.itemsLoaded, event.itemsTotal);
		});
	}

	// ── Custom analyzer registration ─────────────────────────────────────────

	/**
	 * Register a custom analyzer for a resource type.
	 */
	public registerAnalyzer(type: string, analyzer: AnalyzerBase): void {
		this.analyzerMap.set(type, analyzer);
		this.loader.registerAnalyzer(type, analyzer);
	}

	// ── Private methods ──────────────────────────────────────────────────────

	private registerDefaultAnalyzers(): void {
		const imageAnalyzer = new ImageAnalyzer();
		const jsonAnalyzer = new JsonAnalyzer();
		const textAnalyzer = new TextAnalyzer();
		const soundAnalyzer = new SoundAnalyzer();
		const sheetAnalyzer = new SheetAnalyzer();

		this.analyzerMap.set(ResourceType.Image, imageAnalyzer);
		this.analyzerMap.set(ResourceType.Json, jsonAnalyzer);
		this.analyzerMap.set(ResourceType.Text, textAnalyzer);
		this.analyzerMap.set(ResourceType.Sound, soundAnalyzer);
		this.analyzerMap.set(ResourceType.Sheet, sheetAnalyzer);

		// Also register with loader
		this.loader.registerAnalyzer(ResourceType.Image, imageAnalyzer);
		this.loader.registerAnalyzer(ResourceType.Json, jsonAnalyzer);
		this.loader.registerAnalyzer(ResourceType.Text, textAnalyzer);
		this.loader.registerAnalyzer(ResourceType.Sound, soundAnalyzer);
		this.loader.registerAnalyzer(ResourceType.Sheet, sheetAnalyzer);
	}

	private async fetchConfig(url: string): Promise<ResourceConfigData> {
		return new Promise<ResourceConfigData>((resolve, reject) => {
			const request = new HttpRequest();
			request.responseType = HttpResponseType.TEXT;

			const onComplete = (): void => {
				cleanup();
				const response = request.response as string;
				if (!response) {
					const error = new Error(`Failed to load config from "${url}"`);
					this.emit({
						type: ResourceEventType.CONFIG_LOAD_ERROR,
						groupName: '',
						itemsLoaded: 0,
						itemsTotal: 0,
					});
					reject(error);
					return;
				}
				try {
					resolve(JSON.parse(response));
				} catch (e) {
					reject(e);
				}
			};

			const onError = (): void => {
				cleanup();
				const error = new Error(`Failed to fetch config from "${url}"`);
				this.emit({
					type: ResourceEventType.CONFIG_LOAD_ERROR,
					groupName: '',
					itemsLoaded: 0,
					itemsTotal: 0,
				});
				reject(error);
			};

			const cleanup = (): void => {
				request.removeEventListener(Event.COMPLETE, onComplete);
				request.removeEventListener(IOErrorEvent.IO_ERROR, onError);
			};

			request.addEventListener(Event.COMPLETE, onComplete);
			request.addEventListener(IOErrorEvent.IO_ERROR, onError);
			request.open(url);
			request.send();
		});
	}

	private loadResourceList(
		list: ResourceItem[],
		groupName: string,
		_priority: number,
		onProgress?: ProgressCallback,
	): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			let loadedCount = 0;
			const totalCount = list.length;
			let hasError = false;

			this.loader.loadResourceList(list);

			this.loader.onComplete = (item: ResourceItem): void => {
				loadedCount++;
				this.loadedNames.add(item.name);
				this.emit({
					type: ResourceEventType.GROUP_PROGRESS,
					groupName,
					item,
					itemsLoaded: loadedCount,
					itemsTotal: totalCount,
				});
				if (onProgress) {
					onProgress(loadedCount, totalCount);
				}
			};

			this.loader.onError = (item: ResourceItem): void => {
				hasError = true;
				this.emit({
					type: ResourceEventType.ITEM_LOAD_ERROR,
					groupName,
					item,
					itemsLoaded: loadedCount,
					itemsTotal: totalCount,
				});
			};

			// No-op: item-level progress is already reported above via
			// `this.loader.onComplete`. This just satisfies the loader's
			// optional callback slot.
			this.loader.onProgress = (_loaded: number, _total: number): void => {};

			this.loader.start().then(() => {
				this.loader.onComplete = undefined;
				this.loader.onError = undefined;
				this.loader.onProgress = undefined;

				if (hasError) {
					this.emit({
						type: ResourceEventType.GROUP_LOAD_ERROR,
						groupName,
						itemsLoaded: loadedCount,
						itemsTotal: totalCount,
					});
					reject(new Error(`Failed to load some resources in group "${groupName}".`));
				} else {
					this.emit({
						type: ResourceEventType.GROUP_COMPLETE,
						groupName,
						itemsLoaded: loadedCount,
						itemsTotal: totalCount,
					});
					resolve();
				}
			});
		});
	}

	private getAnalyzer(type: string): AnalyzerBase | undefined {
		return this.analyzerMap.get(type);
	}

	private isResourceLoaded(name: string): boolean {
		return this.hasRes(name);
	}

	private emit(event: ResourceEvent): void {
		const set = this.eventListeners.get(event.type);
		if (set) {
			for (const listener of set) {
				try {
					listener(event);
				} catch {
					// swallow listener errors
				}
			}
		}
	}
}

/**
 * Convenience singleton instance.
 */
export const resource: Resource = new Resource();
