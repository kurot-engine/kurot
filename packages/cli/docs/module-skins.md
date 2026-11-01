# Module Skin factories

CLI 3.9.0 adds `ui.skinRegistration: 'module'` for applications that own their
Skin registry. The CLI remains build-time tooling over ui-document ^0.13.0;
it does not acquire Core/UI runtime dependencies.

Both modes export a frozen `skinFactories` object keyed by full authored Skin
class names. The default `'global'` mode additionally registers those factories
on globalThis, preserving standalone Theme loading. `'module'` omits that
registration. Module mode alone does not create a context or isolate other
application state; the application supplies its runtime registry.

```ts
ui: {
	sourceDir: 'resource/ui',
	skinRegistration: 'module',
},
```

Restart `kurot dev` after changing this setting. The KUI documents, generated
`.kurot/skin-parts.d.ts`, and `resource/default.thm.json` mapping keep their usual
formats. The JSON's `skinsJs` identifies the emitted module, including its
content-hashed release filename. Resolve it against the JSON URL instead of
hardcoding a development filename or adding the resource version query to JS.

## Loading into UIContext

This example requires UI >= 3.7.0 within 3.x for `UIContext` and `SkinFactory`.
See the
[UI context contract](../../ui/docs/ui-context.md) for local resolution rules.
The module output can also be consumed by an application's own factory registry.
Existing global applications need no UI upgrade for CLI 3.9.0.

Load fonts and resources before calling this function. Core's resolveResourceUrl
in this example requires Core >= 2.7.0 within 2.x and applies optional release
resource versioning to the JSON request. The JS module keeps its content hash.

```ts
import { resolveResourceUrl } from '@kurot/core';
import type { Resource } from '@kurot/core';
import { Group, UIContext } from '@kurot/ui';
import type { IAssetAdapter, SkinFactory } from '@kurot/ui';

interface GeneratedTheme {
	readonly skins: Readonly<Record<string, string>>;
	readonly skinsJs: string;
}

interface CompiledSkins {
	readonly skinFactories: Readonly<Record<string, SkinFactory>>;
}

export async function loadLocalUI(
	assetAdapter: IAssetAdapter,
	resource: Resource,
	fontFamily: string,
): Promise<{ context: UIContext; root: Group }> {
	const themeUrl = new URL('resource/default.thm.json', document.baseURI);
	const response = await fetch(resolveResourceUrl(themeUrl));
	if (!response.ok) {
		throw new Error(`Theme request failed: ${response.status}`);
	}
	const theme = await response.json() as GeneratedTheme;
	const moduleUrl = new URL(theme.skinsJs, themeUrl);
	const { skinFactories } = await import(moduleUrl.href) as CompiledSkins;
	const context = new UIContext({
		skins: skinFactories,
		defaults: theme.skins,
		assetAdapter,
		resource,
		fontFamily,
	});
	const root = context.run(() => new Group());
	return { context, root };
}
```

Construct application views inside `context.run()` before attaching the root.
Factories inherit their owner's context. Later callbacks that construct views
must use run again; its scope is synchronous and does not continue across await.
Module mode uses this explicit loading path rather than the global Theme loader.

Contexts borrow the supplied adapter, Resource and fonts. Release views and their
listeners/tweens first, dispose the context, then release the owned providers.
Disposing a context does not unload an imported ESM module or release resources.
Custom component constructors must share one identity between application and
Skin bundles; module mode does not change `#ns/` import-map ownership.
