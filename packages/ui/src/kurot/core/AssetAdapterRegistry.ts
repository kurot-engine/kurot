import type { IAssetAdapter } from './IAssetAdapter.js';
import { DefaultAssetAdapter } from './DefaultAssetAdapter.js';

let _adapter: IAssetAdapter = new DefaultAssetAdapter();

/**
 * Replaces the process-wide image asset adapter used by native UI components.
 * Existing component resources are not reloaded by changing this registry.
 */
export function setAssetAdapter(adapter: IAssetAdapter): void {
	_adapter = adapter;
}

/**
 * Returns the current shared adapter, initially a DefaultAssetAdapter.
 */
export function getAssetAdapter(): IAssetAdapter {
	return _adapter;
}
