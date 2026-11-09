import { resource, ResourceType, Texture } from '@kurot/core';
import type { Resource } from '@kurot/core';
import type { IAssetAdapter } from './IAssetAdapter.js';

type SourceProvider = Resource & {
	loadSource?: (source: string, urlType: string) => Promise<unknown>;
};

/**
 * Resolves manifest names, sheet frames and image URLs through one Core
 * Resource. Cache hits complete synchronously; textures are borrowed.
 */
export class DefaultAssetAdapter implements IAssetAdapter {
	private readonly resources: SourceProvider;

	/**
	 * Use Core's shared resource by default, or supply an application's own
	 * Resource for an isolated UIContext. The caller owns its cache lifetime.
	 */
	public constructor(resources: Resource = resource) {
		this.resources = resources;
	}

	public getAsset(source: string, callback: (content: Texture | undefined, source: string) => void): void {
		let cached: unknown;
		let loading: Promise<unknown> | undefined;
		try {
			cached = this.resources.get(source);
			if (cached === undefined && source) {
				loading = this.resources.loadSource
					? this.resources.loadSource(source, ResourceType.Image)
					: loadLegacySource(this.resources, source);
			}
		} catch {
			callback(undefined, source);
			return;
		}
		if (!loading) {
			callback(cached instanceof Texture ? cached : undefined, source);
			return;
		}
		void loading.then(
			value => callback(value instanceof Texture ? value : undefined, source),
			() => callback(undefined, source),
		);
	}
}

// Core 3.2.1–3.2.3 has no loadSource or typed missing-definition error.
// Keep its URL support on the same Resource, without replacing failed
// manifest entries or maintaining another texture cache.
const legacyRequests = new WeakMap<Resource, Map<string, Promise<unknown>>>();

function loadLegacySource(provider: Resource, source: string): Promise<unknown> {
	let requests = legacyRequests.get(provider);
	if (!requests) {
		requests = new Map();
		legacyRequests.set(provider, requests);
	}
	const pending = requests.get(source);
	if (pending) {
		return pending;
	}
	const flight = provider.load(source).catch((error: unknown) => {
		if (!(error instanceof Error) || error.message !== `Resource "${source}" not found in config.`) {
			throw error;
		}
		provider.addResource({ name: source, type: ResourceType.Image, url: source });
		return provider.load(source);
	}).finally(() => requests.delete(source));
	requests.set(source, flight);
	return flight;
}
