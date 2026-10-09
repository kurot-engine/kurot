# @kurot/ui — AI context map

UI 3.4.0 is published, verified on npm on 2026-10-09, and installs published
Core 2.4.0 with a matching registry lockfile, without local overrides. Read
[centered flips](../../../docs/centered-flips.md) before changing transforms,
reflection frames, authored flags or dependency adoption.

Read this before exploring `src/`. It is a compressed map so an agent
unfamiliar with Kurot does not need to re-derive the architecture from scratch
each session. Treat the package source and its `src/index.ts` barrel as the
authority for current behavior and exports; this file provides the compressed
map, runtime contracts and task→file lookup.

Package identity: `@kurot/ui@3.4.0`, EUI-compatible UI framework on top of
`@kurot/core`. Peer-depends on `@kurot/core@^2.4.0`. Rewritten with standard class
inheritance and delegation — no namespace mixins, no prototype copying.
Version 3.3.1 is preserved in commit 60e6404 and fixes transformed parent
allocations. It has not been published; UI 3.4.0 includes the same correction. Version 3.3.0 adds RichLabel and tests against published Core 2.3.1 through its
development installation and lockfile, without overrides. Version 3.2.0 is published with BitmapLabel against published Core 2.2.0,
without local dependency overrides. Published UI 3.1.0 does not contain BitmapLabel.

Source root: `src/kurot/`. Public API: `src/index.ts` is a flat re-export of
7 barrels — `core`, `layouts`, `components`, `events`, `states`, `collections`,
`binding` — see §4.

## 1. Directory map

```
src/kurot/
├── core/           Layout contract + state machine + theming.
│                   IUIComponent (interface every UI component implements),
│                   UIState (the actual layout state machine — see §3),
│                   Validator/validator (render-preparation validation scheduler),
│                   Theme/getTheme()/setTheme(), IViewport, IAssetAdapter/IThemeAdapter.
├── components/     Group, Component (delegation core — see §2), Skin, and
│                   concrete widgets: Button, Label, BitmapLabel, RichLabel, CheckBox, RadioButton,
│                   ToggleButton/ToggleSwitch, ProgressBar, HSlider/VSlider,
│                   Rect, Image, EditableText, TextInput, Panel, ViewStack,
│                   Scroller, UILayer, DataGroup, List, TabBar, ComboBox,
│                   ItemRenderer, HScrollBar/VScrollBar, Animation, Range.
├── text/           Internal text measurement and font-fitting algorithms.
│                   Used by components; not part of the public export barrels.
├── states/         View States: State, IOverride, SetProperty,
│                   SetStateProperty, AddItems. Declarative skin state-diffing.
├── binding/        Watcher (property-chain observer), Binding (static helpers:
│                   bindProperty/bindHandler/bindProperties). Available to programmatic skins and runtime integration code.
├── collections/    ICollection, ArrayCollection. Observable data source for
│                   DataGroup/List/TabBar/ComboBox.
├── layouts/        LayoutBase (abstract), BasicLayout, VerticalLayout,
│                   HorizontalLayout (both extend LinearLayoutBase), TileLayout,
│                   ILayoutTarget.
└── events/         UIEvent, ItemTapEvent, CollectionEvent, PropertyEvent,
                    ScrollerThrowEvent.
```

## 2. Non-obvious current behavior

- `flipX`/`flipY` are native Core booleans inherited by every UI display
  component. Group and Component provide their validated, unscaled actual frame
  through `$getFlipBounds()`. `UIState.getActualBounds()` reads this frame without
  validating recursively. Layout uses the authored matrix, independent of flips;
  negative scale remains anchor-based. Resizing moves the reflection center.

- **`Skin` is NOT a `Group`/DisplayObject subclass.** `components/Skin.ts`
  defines `class Skin extends EventDispatcher<SkinEvents>` — a plain data
  holder, not a visual container. A skin's
  `elementsContent: DisplayObject[]` are physically parented onto the _host_
  `Component` by `Component._setSkin()`, not onto the skin itself. The skin
  object itself never appears in the display tree — its only job is to
  declare `skinParts`/`states`/bindings.
- `Skin.setPart(name, value)` is the intentional write-side counterpart to
  `getPart(name)`: programmatic materializers use it to install authored part
  names as real Skin properties. This preserves the existing EUI Skin model;
  it is not an alternate Map-backed namespace. Callers must reject names that
  collide with `Skin` or inherited runtime members. For Agent-generated UI,
  treat such a collision as invalid authored data and surface a rename
  diagnostic rather than silently rewriting or accepting the name.
- **Two independent, near-duplicate state machines exist.** `Group` implements
  `states`/`currentState`/`_commitCurrentState()` itself (containers have no
  skin). `Component` delegates state application to its attached
  `Skin.currentState` setter. Both call the same `IOverride.apply/remove(host,
skin)` signature, but `Group._commitCurrentState()` passes `this` cast
  `as unknown as Skin` — a type-unsafe workaround since Group has neither a
  real Component nor a real Skin.
- `Component._invokeSkinFactory()` distinguishes KUI-compiled factory
  functions (called with `.call(this)` to supply the host) from real
  `class extends Skin` constructors (detected from their function source and
  invoked with `new`).
- `Component.touchEnabled`/`touchChildren` diverge from the raw `Sprite`
  value while `enabled === false`: the setter stores intent in
  `_explicitTouchEnabled`/`_explicitTouchChildren` but forces the live value
  to `false`. Reading `.touchEnabled` always returns the live (possibly
  forced) value, not the cached intent — easy to miss.
- `UIState.setWidth()`/`setHeight()` write to `this._owner.$explicitWidth`, a
  **core** `DisplayObject` field — not a UIState-local field. Only the
  _measured/actual_ size lives in `UIState`. Setting `.width` is not a simple
  property write: it triggers `invalidateProperties()` +
  `invalidateDisplayList()` + parent invalidation as side effects.
- **Reading `.width`/`.height` can force a synchronous layout pass.**
  `getWidth()/getHeight()` call `_validateSizeNow()` before returning — this
  therefore a getter may perform layout work before returning.
- `Component.measure()` reads `UIState.getUnscaledPreferredBounds()` so skin
  measurement stays in component-local units. Its own scale/rotation/skew must
  affect parent layout bounds only; using transformed preferred bounds here
  applies the transform twice to implicitly sized skins.
- Anchor/percent constraints (`left`/`right`/`percentWidth`, etc.) have zero
  effect until the component is added to a `Group` that has a `layout`
  assigned. Setting them on a standalone/unparented component is a no-op.
- **Since 3.3.1: transformed allocations use parent-space dimensions.**
  `core/fit-transformed-bounds.ts` converts them to local sizes for negative scale,
  rotation and skew. UIState tracks the allocated local axes so width/height
  reads do not discard a rotated one-axis allocation. Anchor/translation affect
  positioning, not size. Incompatible aspect ratios fit the largest contained
  local rectangle; local minima win when containment is impossible. The published
  UI 3.3.0 still falls back to preferred dimensions for non-identity transforms.
- `isUIComponent()` is duck-typed (`'ui' in obj`) — any object with a `.ui`
  property passes, not necessarily a real `Group`/`Component`.
- **Virtual layout defaults to OFF.**
  Must opt in explicitly: `list.useVirtualLayout = true`.
- `ArrayCollection.filterFunction()` **mutates `_source` in place** — filtered-
  out items are permanently removed from the backing array, not just hidden
  from the view. To "unfilter," reassign `source`.
  Also: `source =` setter dispatches `RESET` (resets scroll position
  downstream in `DataGroup`); `replaceAll()` deliberately avoids that to
  preserve scroll position — called out in its own doc comment.
- `Watcher`/`Binding` are **not automatically reactive**. They depend on the
  host manually dispatching `PropertyEvent.PROPERTY_CHANGE` in its setters
  (`PropertyEvent.dispatchPropertyEvent(this, 'propName')`). A property whose
  setter doesn't dispatch this event will never be observed by a binding.
- `Skin.$watchers` (populated by compiled skin factories) must be drained via
  `Skin.unwatchAll()` — done automatically by `Component._setSkin()` when
  detaching, but a hand-rolled skin creating `Watcher`s outside `$watchers`
  will leak listeners.
- `UIEvent.dispatchUIEvent()` is a no-op guard: it returns early
  (`if (!target.hasEventListener(eventType)) return true;`) without
  constructing the event object at all if nobody's listening — used
  pervasively to avoid allocation overhead on every property/position change.
- `childrenCreated()` and `UIEvent.CREATION_COMPLETE` both fire exactly **once
  per component instance**, synchronously, right after `createChildren()` on
  first add to stage. Re-adding a removed component does **not** re-fire
  either — it instead force-validates synchronously via
  `validator.validateClient()`.

## 3. Domain-specific terminology

| Term                                               | Definition                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Where defined                                                                           |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `UIState`                                          | The actual layout state machine every `Group`/`Component` delegates to via `this.ui`. Owns constraint fields (left/right/top/bottom/center/percent) packed into a `Record<K, number\|boolean>` keyed by a numeric `const enum K`. Talks back to its host only through the narrow `IUIOwner` interface, decoupling it from any specific DisplayObject subclass.                                                                                                                    | `core/UIState.ts`                                                                       |
| `IUIOwner`                                         | The callback interface `UIState` uses to talk back to its host component (`createChildren()`, `commitProperties()`, `measure()`, `updateDisplayList()`, `childrenCreated()`). Implemented by `Group` and `Component`.                                                                                                                                                                                                                                                             | `core/UIState.ts`                                                                       |
| Validation cycle                                   | Three deferred phases run in order before core renders: **validateProperties** (shallow→deep, `commitProperties()`), **validateSize** (deep→shallow, `measure()`), **validateDisplayList** (shallow→deep, `updateDisplayList()`). Scheduled through the core ticker's `callLater` queue by the global `Validator`/`validator` singleton and sorted by `$nestLevel` (a **core** `DisplayObject` field, not a UI concept — see `packages/core/src/kurot/display/DisplayObject.ts`). | `core/Validator.ts`                                                                     |
| `Validator.validateClient(target)`                 | Forces synchronous validation of everything at or below `target`'s depth. Used by `validateNow()` and by the re-add-to-stage path in `UIState`.                                                                                                                                                                                                                                                                                                                                   | `core/Validator.ts`                                                                     |
| `Theme`                                            | Maps a component's class name (`hostComponentKey`) to a default skin class name, loaded via `IThemeAdapter` (network fetch by default). Components created before the theme finishes loading queue into a `_delayList` and get skinned retroactively.                                                                                                                                                                                                                             | `core/Theme.ts`                                                                         |
| `skinParts`                                        | `Skin.skinParts: string[]` lists the complete named part set exposed by a skin. `Component` collects the values into one internal read-only map, exposes it through the public typed `skinParts` accessor, then invokes `onSkinReady()`. Before replacement or removal, `onSkinRemoved()` runs while the old complete map remains available. No dynamic properties are written to the component instance.                                                                         | `components/Skin.ts`, `components/Component.ts`                                         |
| Skin/State/SetProperty pattern                     | Declare `skinParts` + `states: State[]` in a `Skin` subclass. `Component.currentState` flows into `Skin.currentState`, which diffs old vs new `State.overrides` and calls `apply()`/`remove()` on each `IOverride`.                                                                                                                                                                                                                                                               | `states/State.ts`, `states/IOverride.ts`, `states/SetProperty.ts`, `components/Skin.ts` |
| `IViewport`                                        | Extends `IUIComponent` with `contentWidth`/`contentHeight` (readonly) and `scrollH`/`scrollV`/`scrollEnabled`. Implemented by `Group` (and thus `DataGroup`/`List`), consumed by `Scroller`.                                                                                                                                                                                                                                                                                      | `core/IViewport.ts`                                                                     |
| Virtual layout                                     | Layout mode where only currently-visible-index item renderers are instantiated; off-screen renderers recycle into `DataGroup._freeRenderers` (a `Map<class, ItemRenderer[]>` free-list pool keyed by renderer class). Toggled via `layout.useVirtualLayout`. Off by default.                                                                                                                                                                                                      | `layouts/LayoutBase.ts`, `components/DataGroup.ts`                                      |
| `childrenCreated()` vs `UIEvent.CREATION_COMPLETE` | `childrenCreated()` is the imperative override hook, called synchronously once right after `createChildren()`. `CREATION_COMPLETE` is the event fired immediately after, for external listeners. Both fire at the same instant, exactly once per instance.                                                                                                                                                                                                                        | `core/UIState.ts` (`$onAddToStage`), `events/UIEvent.ts`                                |

## 4. Public API surface (`src/index.ts`)

Flat re-export of 7 barrels, in this order: `core`, `layouts`, `components`,
`events`, `states`, `collections`, `binding`.

- **core**: `IUIComponent`, `IUIOwner`, `UIState`, `isUIComponent`, `Validator`/`validator`, `Theme`/`getTheme`/`setTheme`, `IViewport`, `IAssetAdapter`/`DefaultAssetAdapter`, `setAssetAdapter`/`getAssetAdapter`, `IThemeAdapter`/`DefaultThemeAdapter`, `Direction`, `ScrollPolicy`, `IDisplayText`, `IItemRenderer`.
- **layouts**: `ILayoutTarget`, `LayoutBase`, `BasicLayout`, `LinearLayoutBase`, `VerticalLayout`, `HorizontalLayout`, `TileLayout`, `ColumnAlign`, `RowAlign`, `JustifyAlign`, `TileOrientation`.
- **components**: `Group`/`GroupEvents`, `Component`/`ComponentEvents`, `Skin`/`SkinEvents`; `Button`, `Label`/`TextFitMode` (type), `BitmapLabel`, `RichLabel`, `CheckBox`, `RadioButton`/`RadioButtonGroup`, `ToggleButton`, `ToggleSwitch`, `ProgressBar`, `HSlider`/`VSlider`/`SliderBase`, `Rect`, `Image`, `EditableText`, `TextInput`, `Panel`, `ViewStack`, `Scroller`, `TouchScroll`, `UILayer`, `DataGroup`, `List`/`ListBase`, `TabBar`, `ComboBox`, `ItemRenderer`, `HScrollBar`/`VScrollBar`/`ScrollBarBase`, `Animation`, `Range`.
- **events**: `UIEvent`, `ItemTapEvent`, `CollectionEvent`/`CollectionEventKind`, `PropertyEvent`, `ScrollerThrowEvent`.
- **states**: `State`, `IOverride`, `SetProperty`, `SetStateProperty`, `AddItems`.
- **collections**: `ICollection`, `ArrayCollection`.
- **binding**: `Watcher`, `Binding`.

## 5. Dependency on `@kurot/core` — and the dirty-flag interaction

Builds directly on core's `DisplayObject`/`DisplayObjectContainer`/`Sprite`
(`Group` and `Component` both `extend Sprite`), `EventDispatcher`/`Event`,
`Rectangle`/`Matrix`/`Point`, and `TextField` (wrapped by `Label`/
`EditableText`).

**UIState deliberately hooks into core's render-dirty system.** In
`UIState._setActualSize()`, after updating width/height it explicitly calls
`this._owner.$markDirty()` — the source comment explains why: a layout size
change affects rendered bounds, and since UI layout is deferred to the core
ticker's render-preparation queue (while core's dirty propagation runs
synchronously on the mutation's own tick), a `cacheAsBitmap`-flagged ancestor could otherwise
render a stale bitmap after deferred measurement completes. Similarly,
`Skin`'s re-add-to-stage path forces `validateNow()` synchronously to avoid
`structureDirty` firing before the `Validator` has filled in graphics
commands. **Takeaway: UI validation is deferred but runs through core's ticker
before the corresponding render; add-to-stage and size changes still explicitly
bridge layout invalidation into core's render-dirty system.**

Also: `Group`/`Component` override several `$`-prefixed **internal** core
methods (`$updateUseTransform`, `$setMatrix`, `$setAnchorOffsetX/Y`,
`$setX/Y`) purely to hook `ui.$invalidateParentLayout()`. Code that mutates
transform directly at the core level bypassing these overrides risks not
triggering a parent layout re-validation — a coupling point worth knowing
before patching core's transform code.

## 6. Task → file map

| I want to...                                  | Look at                                                                                                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add a new skinnable widget                    | `components/Component.ts` for the base pattern, model on `components/Button.ts`                                                                                           |
| Add a new container-only widget (no skin)     | `components/Group.ts`                                                                                                                                                     |
| Change Label font fitting                     | `text/fit-label-text.ts` for metric calculation; `components/Label.ts` for layout and lifecycle integration                                                               |
| Add a new layout algorithm                    | `layouts/LayoutBase.ts`, follow `layouts/VerticalLayout.ts`                                                                                                               |
| Debug a state not applying                    | `components/Skin.ts` (`currentState` setter, `_applyState`), `states/State.ts`, `states/IOverride.ts`                                                                     |
| Debug a binding not firing                    | Check the source property's setter actually calls `PropertyEvent.dispatchPropertyEvent` — see `binding/Watcher.ts`                                                        |
| Add virtual-layout support to a new layout    | `layouts/LayoutBase.ts` (`elementAdded`/`elementRemoved`/`getElementIndicesInView`/`clearVirtualLayoutCache`), reference `layouts/VerticalLayout.ts`'s `elementSizeTable` |
| Understand validation/render scheduling order | `core/Validator.ts`, core `player/SystemTicker.ts`                                                                                                                        |
| Measure UI validation/rendering performance   | `examples/benchmark/` for the visual runner, scenarios, Playwright automation, and local JSON/Markdown reports                                                            |

## Label text layout contract in 3.1.0

Label defaults to multiline; explicit false draws only the first hard-separated
line without wrapping. EditableText defaults to single-line and rejects
shrinking. `wordWrap` chooses Unicode versus character boundaries only while
multiline is enabled.

`TextFitMode` is exported with Label. `textFit` is `none` by default or `shrink`
for single-line Labels. `minFontSize` defaults to 12 and must be finite and >= 1.
`size` stays authored; `renderedSize` and `textFitOverflow` are read-only results
after validation. Fitting uses fixed axes, parent layout constraints or explicit
maximums, reserves outline thickness and caches unchanged metrics. Measured
automatic bounds are not fed back as fit constraints.

`label.invalidateSize()` also invalidates Core line metrics. Call it after
late font loading, even if the family name did not change. This requires
Core >= 2.1.0 for that API; UI 3.3.0's package requirement is Core ^2.3.0.
There is no global font-readiness listener.

See [Label text layout](label-text-layout.md) for fit bounds, state restoration,
font readiness and shared-schema boundaries. Native UI still depends only on
Core; KUI authoring uses ui-document 0.11.x, published CLI 3.3.0 and
published ui-runtime 0.8.2. Label presets expand in consumer-owned
copies before native rendering; UI does not read style.json or consume textStyle.

## Bitmap labels in 3.2.0

[bitmap-label.md](bitmap-label.md) documents the new exported BitmapLabel,
using one BitmapText child and the configured Core resource singleton for string
font names. Stale async results are guarded by request generation. Core ^2.2.0
is required; local Core overrides have been removed. Published UI 3.1.0 does
not contain it. KUI catalog, installed compilers and Editor adoption are separate.

## Rich labels in 3.3.0

[rich-label.md](rich-label.md) defines RichLabel, an independent Component using
one native TextField. Only textFlow supplies content; no Label text/appearance
properties, textFit or textStyle. Reads and assignments copy runs and styles;
[] clears content. Wrapping is continuous across styles. Measurement uses Core
2.3.0's pure measureText with parent width, explicit width or maxWidth; cached
metrics clear on invalidateSize, including after fonts load. Geometry, multiline,
wordWrap, lineSpacing, textAlign and verticalAlign remain component-level.

Task → `components/RichLabel.ts`, `test/RichLabel.test.ts`,
`test/browser/text-labels.spec.ts`. Run `pnpm test:text-labels` after building
Core and UI. BitmapLabel automatic measurement now uses maxWidth too. The KUI
catalog is available in published ui-document 0.12.0+, CLI 3.4.0+ and
ui-runtime 0.9.0+. Editor adoption remains an explicit application update.
