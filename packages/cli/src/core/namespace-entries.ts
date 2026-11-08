import type { Plugin } from 'esbuild';
import type { CustomNamespace } from './project.js';

/**
 * Only the namespace entry is public. Let esbuild resolve all of its dependencies
 * in the same module graph as the game, including tsconfig paths and package exports.
 */
export function namespaceEntriesPlugin(namespaces: readonly CustomNamespace[], root: string): Plugin {
	const bySpecifier = new Map(namespaces.map(ns => [ns.specifier, ns]));
	return {
		name: 'kurot-namespace-entries',
		setup(build): void {
			build.onResolve({ filter: /^#ns\// }, args => {
				const ns = bySpecifier.get(args.path);
				if (!ns) {
					return undefined;
				}
				return ns.entry ? { path: ns.entry } : { path: ns.specifier, namespace: 'kurot-components' };
			});
			build.onLoad({ filter: /.*/, namespace: 'kurot-components' }, args => {
				const ns = bySpecifier.get(args.path);
				const exports = ns?.components?.map(component =>
					`export { ${component.name} } from ${JSON.stringify(component.source)};`,
				);
				return { contents: exports?.join('\n') || 'export {};', resolveDir: root, loader: 'ts' };
			});
		},
	};
}
