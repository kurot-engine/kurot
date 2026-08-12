import type * as esbuild from 'esbuild';
import * as path from 'node:path';

/**
 * Normalizes an absolute file path into a namespace-module lookup key by
 * stripping its extension, if present.
 *
 * Both sides of the lookup go through this: `compile-custom-namespaces.ts`
 * keys `ctx.outputs.namespaceModules` by the exact files esbuild reports it
 * inlined (`metafile.outputs[x].inputs`), and `namespaceModuleExternalPlugin`
 * normalizes a resolved import path the same way before checking the map.
 * Stripping the extension is what lets a `./HeroNarrowIR.js` import (the
 * `.js`-suffixed ESM import convention used throughout this codebase, e.g.
 * `import { HeroNarrowIR } from './ui/index.js'`) match its `HeroNarrowIR.ts`
 * source file (the metafile key).
 *
 * @param absolutePath - Absolute file path to normalize
 * @returns The path with its extension stripped, if any
 */
export function normalizeModuleKey(absolutePath: string): string {
	const ext = path.extname(absolutePath);
	return ext ? absolutePath.slice(0, -ext.length) : absolutePath;
}

/**
 * Rewrites imports that resolve to a project-defined namespace's source files
 * to that namespace's virtual specifier, marking them external.
 *
 * A custom-namespace class (e.g. `HeroNarrowIR`) can be referenced two ways:
 * game code imports it by relative path (`./ui/HeroNarrowIR.js`), while
 * EXML-generated skins import it by the virtual specifier (`#ns/game`,
 * resolved via the HTML import map — see `compile-custom-namespaces.ts`).
 * `external: [specifier]` alone only catches the second case; esbuild matches
 * externals by the literal import string, so the relative import would
 * otherwise get inlined as a second, distinct copy of the class with
 * mismatched `instanceof` identity.
 *
 * `namespaceModules` is precise (sourced from esbuild's own metafile, not a
 * guess), so this covers every file a namespace chunk actually inlined — not
 * just its barrel entry point. Deliberately synchronous and does no file
 * system I/O: esbuild's own docs warn against calling `build.resolve()`
 * recursively from within `onResolve` (no loop detection), and this codebase's
 * `.js`-suffixed import convention (see `normalizeModuleKey`) makes that
 * unnecessary — a plain path + extension-strip is enough to match.
 *
 * @param namespaceModules - Extensionless absolute path → virtual specifier,
 * populated from esbuild's `metafile.outputs[x].inputs` (see `compile-custom-namespaces.ts`)
 * @returns An esbuild plugin implementing the rewrite
 */
export function namespaceModuleExternalPlugin(namespaceModules: ReadonlyMap<string, string>): esbuild.Plugin {
	return {
		name: 'blakron-namespace-external',
		setup(build): void {
			if (namespaceModules.size === 0) return;

			build.onResolve({ filter: /^\./ }, args => {
				// Entry points resolve normally; only rewrite actual import statements.
				if (args.kind !== 'import-statement' && args.kind !== 'dynamic-import') return undefined;

				const resolved = path.resolve(args.resolveDir, args.path);
				const specifier = namespaceModules.get(normalizeModuleKey(resolved));
				if (!specifier) return undefined;

				return { path: specifier, external: true };
			});
		},
	};
}
