# Image sources and cache ownership

Native Image and Button icons use DefaultAssetAdapter unless the application
sets a different adapter. Load the Core manifest before constructing skins that
refer to its names. Preloading is optional: with Core's `Resource.loadSource`
the adapter can load a registered image or a sheet on demand. No registration
of the default adapter is necessary.

```ts
import { resource } from '@kurot/core';
import { Image } from '@kurot/ui';

await resource.loadConfig('resource/default.res.json', 'resource/');
const portrait = new Image('hero_portrait');      // manifest image
const badge = new Image('hud.badge');             // frame on sheet "hud"
const remote = new Image('resource/avatars/7.png'); // unregistered URL
```

A declared bare subkey such as `badge` also works. For a bare frame not
declared in the manifest, load its sheet first or use `sheet.frame`. A literal
manifest image URL identifies its declared resource when the URL has one
owner. Use explicit names for ambiguous URLs. Other URLs use their exact
input string as the cache key, including query and fragment. Network version
parameters are applied by Core's transport, not by the adapter; don't prepend
a private prefix or append the build version for cache lookup.

A hit calls back **before getAsset returns** with the same Texture and the
original source. An Image applies it during the current property commit;
rebuilding a List row doesn't require another frame. A miss completes once,
with a borrowed Texture on success or undefined on failure or non-texture
content. A declared resource that fails does not trigger a request for its
logical name as a URL. A subsequent call can retry. A cache shared by
preload, other adapters and UI controls belongs to the Resource: release the
image by its key (a sheet by its owner name), or call `destroyAll()` when its
consumers are finished. Removing an Image/List does not dispose textures.

For a scoped game, pass the same Resource used for its manifest:

```ts
import { Resource } from '@kurot/core';
import { DefaultAssetAdapter, UIContext } from '@kurot/ui';

const resources = new Resource();
await resources.loadConfig('game/res.json', 'game/');
const context = new UIContext({
    skins: {},
    resource: resources,
    assetAdapter: new DefaultAssetAdapter(resources),
});
```

An explicit IAssetAdapter registered globally or supplied to a UIContext
still takes precedence. A project with legacy names can translate those
in its own adapter, delegate to DefaultAssetAdapter, and return the caller's
original source. Manifest conversion, custom analyzers and release version
configuration remain application responsibilities.

For all the behaviors above, use UI **>= 5.2.0 within 5.x** with Core
**>= 3.3.0 within 3.x**, which exports `Resource.loadSource`. The Core peer
minimum remains `^3.2.1`. Older supported Core peers still load known
resources and direct image URLs, reuse identical adapter requests, and can
read preloaded frames. They do not share pending group loads or resolve all
cold qualified frames or manifest URL aliases.
