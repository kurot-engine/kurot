import { pathToFileURL } from 'node:url';
import type { ProjectConfig } from './config.js';

let jsRevision = 0;

/**
 * Reload only the root config on a watched edit. Its helpers keep their module
 * identity until the dev process restarts, for both TypeScript and native JS.
 */
export async function importConfig(file: string, fresh = false): Promise<Partial<ProjectConfig>> {
	if (file.endsWith('.ts')) {
		const { createJiti } = await import('jiti');
		const loader = createJiti(import.meta.url, { tryNative: false });
		if (fresh) {
			delete loader.cache[loader.resolve(file)];
		}
		return loader.import<Partial<ProjectConfig>>(file, { default: true });
	}
	const url = pathToFileURL(file);
	if (fresh) {
		url.searchParams.set('kurotConfigRevision', String(++jsRevision));
	}
	const mod = await import(url.href);
	return mod.default ?? mod;
}
