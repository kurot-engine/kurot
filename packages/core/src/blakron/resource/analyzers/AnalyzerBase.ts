import { ResourceItem } from '../ResourceItem.js';

/**
 * Base class for resource analyzers.
 * Each analyzer handles loading and caching one type of resource.
 */
export abstract class AnalyzerBase {
	/** Cached resource data: name → data */
	protected fileDic: Map<string, unknown> = new Map<string, unknown>();

	/**
	 * Load a resource file. Returns a promise that resolves with the ResourceItem
	 * (with `loaded` set to true on success, false on failure).
	 */
	public abstract loadFile(item: ResourceItem): Promise<ResourceItem>;

	/**
	 * Get a cached resource by name.
	 */
	public getRes<T = unknown>(name: string): T | undefined {
		return this.fileDic.get(name) as T | undefined;
	}

	/**
	 * Check if a resource is cached.
	 */
	public hasRes(name: string): boolean {
		return this.fileDic.has(name);
	}

	/**
	 * Remove a cached resource. Returns true if the resource existed.
	 */
	public destroyRes(name: string): boolean {
		if (this.fileDic.has(name)) {
			this.onResourceDestroy(this.fileDic.get(name)!);
			this.fileDic.delete(name);
			return true;
		}
		return false;
	}

	/**
	 * Called when a resource is destroyed. Subclasses override for cleanup.
	 */
	protected onResourceDestroy(_resource: unknown): void {
		// override in subclasses
	}
}
