import type { IAssetAdapter } from './IAssetAdapter.js';
import { DefaultAssetAdapter } from './DefaultAssetAdapter.js';

let _adapter: IAssetAdapter = new DefaultAssetAdapter();

export function setAssetAdapter(adapter: IAssetAdapter): void {
	_adapter = adapter;
}

export function getAssetAdapter(): IAssetAdapter {
	return _adapter;
}
