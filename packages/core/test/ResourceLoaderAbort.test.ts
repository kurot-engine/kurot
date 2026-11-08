import { expect, it, vi } from 'vitest';
import { ResourceItem } from '../src/kurot/resource/ResourceItem.js';
import { ResourceLoader } from '../src/kurot/resource/ResourceLoader.js';
import { AnalyzerBase } from '../src/kurot/resource/analyzers/AnalyzerBase.js';

it.each(['resolve', 'reject'])('ignores an aborted request that settles via %s during the next batch', async outcome => {
	const pending: Array<(success: boolean) => void> = [];
	class Controlled extends AnalyzerBase {
		public loadFile(item: ResourceItem): Promise<ResourceItem> {
			return new Promise((resolve, reject) => {
				pending.push(success => {
					if (success) {
						item.loaded = true;
						resolve(item);
					} else {
						reject(new Error('late failure'));
					}
				});
			});
		}
	}
	const loader = new ResourceLoader();
	loader.registerAnalyzer('controlled', new Controlled());
	loader.onProgress = vi.fn();
	loader.onComplete = vi.fn();
	const start = (name: string): Promise<void> => {
		loader.loadResourceList([new ResourceItem(name, name, 'controlled')]);
		return loader.start();
	};
	const a = start('A');
	loader.abort();
	await a;
	const ended = vi.fn();
	const b = start('B').then(ended);
	pending[0](outcome === 'resolve');
	await new Promise<void>(resolve => queueMicrotask(resolve));
	expect(ended).not.toHaveBeenCalled();
	expect(loader.onProgress).not.toHaveBeenCalled();
	expect(loader.onComplete).not.toHaveBeenCalled();
	expect(pending).toHaveLength(2);
	pending[1](true);
	await b;
	const c = start('C');
	pending[2](true);
	await c;
	expect(loader.onProgress).toHaveBeenCalledTimes(2);
});
