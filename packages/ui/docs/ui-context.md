# Local UI contexts

UIContext requires UI >= 3.7.0 within 3.x. CLI >= 3.9.0 within 3.x provides
the matching module output. See
[module Skin loading](../../cli/docs/module-skins.md) for configuration and a
loader that resolves both development and hashed release module URLs.

`UIContext` lets independent applications share one Core/UI runtime and Player
while retaining their own Skin names, default mappings, image resources and
UI default font. Contexts do not implement game navigation, networking or wallets.

```ts
import { Group, UIContext } from '@kurot/ui';
import { skinFactories } from './compiled-skins.js';

const context = new UIContext({
    skins: skinFactories,
    defaults: themeConfig.skins,
    assetAdapter: gameAssetAdapter,
    resource: gameResources,
    fontFamily: gameFontFamily,
});
const root = context.run(() => new Group());
context.bind(root);
```

Load fonts, resources and compiled factories before constructing the application.
Construct its detached views inside `context.run(() => new Application(root))`.
The host can then attach the game root and start the application. Factories run
inside their owner's context; delayed DataGroup renderers inherit that context.
For views created later in application callbacks, use the same synchronous run
around construction. `run` restores the previous construction context immediately;
it does not retain a global current context across await or asynchronous callbacks.

A captured context belongs to that view's lifetime. Rebinding a captured root to
another context throws; construct a new subtree for a different application.
An unbound node can inherit the nearest bound ancestor at lookup time. This
cannot undo global Skin factories already invoked while constructing it outside
run: establish the context before setting string skinName on detached views.

## Resolution and compatibility

- A scoped Component uses local host-key/class/ancestor default mappings.
- Explicit string skinName resolves only in that context's factory map. A miss
  clears the Skin, preserving the existing missing-name behavior, and never
  resolves a global factory or the Host Theme.
- Nested factories and list/item-renderer skins use the same context.
- Named RadioButton groups are local to the context, including the implicit
  default group. Equal group names in separate contexts do not share selection.
  Binding an existing subtree migrates automatic groups synchronously and removes
  their old global membership. Adding a subtree below a bound root does the same
  before target ADDED handlers, including plain Core Sprite containers. Buttons
  also resolve before add-to-stage initialization and creation callbacks, which
  run earlier than ADDED. Captured descendants retain their own context.
  Removing a subtree does not dispose it
  or reset its group; a later insertion/bind resolves the destination context.
  Assigning group explicitly (including undefined) opts out of automatic context
  migration. Changing groupName resumes automatic grouping; assigning the same
  name preserves an explicit group. Authors own explicitly shared group lifetime.
  The context registry uses weak keys so detached radio members cannot root a
  disposed game's context. Unscoped radios retain the global grouping behavior.
- Image uses its context's assetAdapter. BitmapLabel uses its context's Resource;
  without that provider a scoped bitmap-font lookup does not use global resource.
- Label/EditableText use the context default family; explicit fontFamily takes
  priority. RichLabel created inside run uses the same default for unstyled runs.
- Core TextField and custom raster text are not UI Label. Their authors must
  explicitly use the context family; TextField.default_fontFamily is unchanged.
- Unscoped applications keep global Theme, skin registration and asset adapter
  behavior. Direct Skin instances and constructors remain supported.

Contexts borrow their adapters/resources/fonts; the application owns their
loading and release. `context.dispose()` revokes new construction and ignores
late Image/font-resource replies. Release views and their subscriptions/tweens,
then dispose the context and the owned resource/font providers. A Resource
`destroyAll()` does not abort pending loads; owners must reclaim late results.
The context does not stop a global ticker, destroy the Player or unload ESM code.

## CLI module mode

Set `ui.skinRegistration: 'module'` in the project configuration. The CLI emits
`skinFactories` as a named export and keeps the usual generated default Skin
mapping in default.thm.json. It does not write factories to globalThis. Import
that map into the application context instead of loading a global Theme.
The default global mode retains its original registration behavior.

Custom component constructors must have one identity across the game entry and
its skin bundle. A game publisher should bundle its own namespace into the game
module/shared chunk, externalizing Core/UI/Game. Page-wide `#ns/custom` import-map
entries must not be overwritten when loading another game's components.

Tests cover simultaneous contexts, construction rollback, delayed renderers,
late asset replies, local fonts and unchanged global defaults. Application
browser acceptance additionally covers packed SDKs, compiled KUI, real input,
public overlays, cancellation and repeated entry/exit.
