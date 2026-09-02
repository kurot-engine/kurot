# @kurot/ui — AI context map

Read this before exploring `src/`. It is a compressed map so an agent
unfamiliar with Kurot does not need to re-derive the architecture from scratch
each session. Treat the package source and its `src/index.ts` barrel as the
authority for current behavior and exports; this file provides the compressed
map, runtime contracts and task→file lookup.

Package identity: `@kurot/ui@1.1.10`, EUI-compatible UI framework on top of
`@kurot/core`. Peer-depends on `@kurot/core`. Rewritten with standard class
inheritance and delegation — no namespace mixins, no prototype copying.

Source root: `src/kurot/`. Public API: `src/index.ts` is a flat re-export of
7 barrels — `core`, `layouts`, `components`, `events`, `states`, `collections`,
`binding` — see §4.

## 1. Directory map

```
src/kurot/
├── core/           Layout contract + state machine + theming.
│                   IUIComponent (interface every UI component implements),
│                   UIState (the actual layout state machine — see §3),
│                   Validator/validator (global RAF-batched validation scheduler),
│                   Theme/getTheme()/setTheme(), IViewport, IAssetAdapter/IThemeAdapter.
├── components/     Group, Component (delegation core — see §2), Skin, and
│                   concrete widgets: Button, Label, CheckBox, RadioButton,
│                   ToggleButton/ToggleSwitch, ProgressBar, HSlider/VSlider,
│                   Rect, Image, EditableText, TextInput, Panel, ViewStack,
│                   Scroller, UILayer, DataGroup, List, TabBar, ComboBox,
│                   ItemRenderer, HScrollBar/VScrollBar, Animation, Range.
├── states/         View States: State, IOverride, SetProperty,
│                   SetStateProperty, AddItems. Declarative skin state-diffing.
├── binding/        Watcher (property-chain observer), Binding (static helpers:
│                   bindProperty/bindHandler/bindProperties). Used by compiled
│                   EXML {expr} syntax; usable manually too.
├── collections/    ICollection, ArrayCollection. Observable data source for
│                   DataGroup/List/TabBar/ComboBox.
├── layouts/        LayoutBase (abstract), BasicLayout, VerticalLayout,
│                   HorizontalLayout (both extend LinearLayoutBase), TileLayout,
│                   ILayoutTarget.
└── events/         UIEvent, ItemTapEvent, CollectionEvent, PropertyEvent,
                    ScrollerThrowEvent.
```

## 2. Non-obvious current behavior

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
- `Component._invokeSkinFactory()` distinguishes EXML-compiled **factory
  functions** (called with `.call(this)`, so `this` resolves to the host —
  required for `Binding.bindProperty(this, ...)`) from real `class extends
Skin` constructors (detected via regex on `Function.prototype.toString()`,
  invoked with `new`). A hand-written class-based skin using EXML-style
  `{binding}` syntax will silently get the wrong `this` — the source comment
  explicitly warns skins with EXML bindings must be factory functions, not
  classes.
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
- Anchor/percent constraints (`left`/`right`/`percentWidth`, etc.) have zero
  effect until the component is added to a `Group` that has a `layout`
  assigned. Setting them on a standalone/unparented component is a no-op.
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

| Term                                               | Definition                                                                                                                                                                                                                                                                                                                                                                                                        | Where defined                                                                           |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `UIState`                                          | The actual layout state machine every `Group`/`Component` delegates to via `this.ui`. Owns constraint fields (left/right/top/bottom/center/percent) packed into a `Record<K, number\|boolean>` keyed by a numeric `const enum K`. Talks back to its host only through the narrow `IUIOwner` interface, decoupling it from any specific DisplayObject subclass.                                                    | `core/UIState.ts`                                                                       |
| `IUIOwner`                                         | The callback interface `UIState` uses to talk back to its host component (`createChildren()`, `commitProperties()`, `measure()`, `updateDisplayList()`, `childrenCreated()`). Implemented by `Group` and `Component`.                                                                                                                                                                                             | `core/UIState.ts`                                                    |
| Validation cycle                                   | Three RAF-batched phases run in order: **validateProperties** (shallow→deep, `commitProperties()`), **validateSize** (deep→shallow, `measure()`), **validateDisplayList** (shallow→deep, `updateDisplayList()`). Scheduled by the global `Validator`/`validator` singleton, sorted by `$nestLevel` (a **core** `DisplayObject` field, not a UI concept — see `packages/core/src/kurot/display/DisplayObject.ts`). | `core/Validator.ts`                                                                     |
| `Validator.validateClient(target)`                 | Forces synchronous validation of everything at or below `target`'s depth. Used by `validateNow()` and by the re-add-to-stage path in `UIState`.                                                                                                                                                                                                                                                                   | `core/Validator.ts`                                                                     |
| `Theme`                                            | Maps a component's class name (`hostComponentKey`) to a default skin class name, loaded via `IThemeAdapter` (network fetch by default). Components created before the theme finishes loading queue into a `_delayList` and get skinned retroactively.                                                                                                                                                             | `core/Theme.ts`                                                                         |
| `skinParts`                                        | `Skin.skinParts: string[]` — property names the component looks up via `skin.getPart(name)` (plain `this[name]` lookup on the skin instance) and binds via `Component.setSkinPart()`. Purely convention-based, no decorators/metadata.                                                                                                                                                                            | `components/Skin.ts`, `components/Component.ts`                                         |
| Skin/State/SetProperty pattern                     | Declare `skinParts` + `states: State[]` in a `Skin` subclass. `Component.currentState` flows into `Skin.currentState`, which diffs old vs new `State.overrides` and calls `apply()`/`remove()` on each `IOverride`.                                                                                                                                                                                               | `states/State.ts`, `states/IOverride.ts`, `states/SetProperty.ts`, `components/Skin.ts` |
| `IViewport`                                        | Extends `IUIComponent` with `contentWidth`/`contentHeight` (readonly) and `scrollH`/`scrollV`/`scrollEnabled`. Implemented by `Group` (and thus `DataGroup`/`List`), consumed by `Scroller`.                                                                                                                                                                                                                      | `core/IViewport.ts`                                                                     |
| Virtual layout                                     | Layout mode where only currently-visible-index item renderers are instantiated; off-screen renderers recycle into `DataGroup._freeRenderers` (a `Map<class, ItemRenderer[]>` free-list pool keyed by renderer class). Toggled via `layout.useVirtualLayout`. Off by default.                                                                                                                                     | `layouts/LayoutBase.ts`, `components/DataGroup.ts`                                      |
| `childrenCreated()` vs `UIEvent.CREATION_COMPLETE` | `childrenCreated()` is the imperative override hook, called synchronously once right after `createChildren()`. `CREATION_COMPLETE` is the event fired immediately after, for external listeners. Both fire at the same instant, exactly once per instance.                                                                                                                                                        | `core/UIState.ts` (`$onAddToStage`), `events/UIEvent.ts`                                |

## 4. Public API surface (`src/index.ts`)

Flat re-export of 7 barrels, in this order: `core`, `layouts`, `components`,
`events`, `states`, `collections`, `binding`.

- **core**: `IUIComponent`, `IUIOwner`, `UIState`, `isUIComponent`, `Validator`/`validator`, `Theme`/`getTheme`/`setTheme`, `IViewport`, `IAssetAdapter`/`DefaultAssetAdapter`, `setAssetAdapter`/`getAssetAdapter`, `IThemeAdapter`/`DefaultThemeAdapter`, `Direction`, `ScrollPolicy`, `IDisplayText`, `IItemRenderer`.
- **layouts**: `ILayoutTarget`, `LayoutBase`, `BasicLayout`, `LinearLayoutBase`, `VerticalLayout`, `HorizontalLayout`, `TileLayout`, `ColumnAlign`, `RowAlign`, `JustifyAlign`, `TileOrientation`.
- **components**: `Group`/`GroupEvents`, `Component`/`ComponentEvents`, `Skin`/`SkinEvents`; `Button`, `Label`, `CheckBox`, `RadioButton`/`RadioButtonGroup`, `ToggleButton`, `ToggleSwitch`, `ProgressBar`, `HSlider`/`VSlider`/`SliderBase`, `Rect`, `Image`, `EditableText`, `TextInput`, `Panel`, `ViewStack`, `Scroller`, `TouchScroll`, `UILayer`, `DataGroup`, `List`/`ListBase`, `TabBar`, `ComboBox`, `ItemRenderer`, `HScrollBar`/`VScrollBar`/`ScrollBarBase`, `Animation`, `Range`.
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
change affects rendered bounds, and since UI layout is deferred to the next
RAF tick via `Validator` (while core's dirty propagation runs synchronously on
the mutation's own tick), a `cacheAsBitmap`-flagged ancestor could otherwise
render a stale bitmap after deferred measurement completes. Similarly,
`Skin`'s re-add-to-stage path forces `validateNow()` synchronously to avoid
`structureDirty` firing before the `Validator` has filled in graphics
commands. **Takeaway: core's render pipeline and UI's validation pipeline are
two independently-scheduled systems, manually kept in sync at specific
integration points** (add-to-stage, size changes) — not fully decoupled.

Also: `Group`/`Component` override several `$`-prefixed **internal** core
methods (`$updateUseTransform`, `$setMatrix`, `$setAnchorOffsetX/Y`,
`$setX/Y`) purely to hook `ui.$invalidateParentLayout()`. Code that mutates
transform directly at the core level bypassing these overrides risks not
triggering a parent layout re-validation — a coupling point worth knowing
before patching core's transform code.

## 6. Task → file map

| I want to...                                   | Look at                                                                                                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add a new skinnable widget                     | `components/Component.ts` for the base pattern, model on `components/Button.ts`                                                                                           |
| Add a new container-only widget (no skin)      | `components/Group.ts`                                                                                                                                                     |
| Add a new layout algorithm                     | `layouts/LayoutBase.ts`, follow `layouts/VerticalLayout.ts`                                                                                                               |
| Debug a state not applying                     | `components/Skin.ts` (`currentState` setter, `_applyState`), `states/State.ts`, `states/IOverride.ts`                                                                     |
| Debug a binding not firing                     | Check the source property's setter actually calls `PropertyEvent.dispatchPropertyEvent` — see `binding/Watcher.ts`                                                        |
| Add virtual-layout support to a new layout     | `layouts/LayoutBase.ts` (`elementAdded`/`elementRemoved`/`getElementIndicesInView`/`clearVirtualLayoutCache`), reference `layouts/VerticalLayout.ts`'s `elementSizeTable` |
| Understand the validation/RAF scheduling order | `core/Validator.ts`                                                                                                                                                       |
| Measure UI validation/rendering performance    | `examples/benchmark/` for the visual runner, scenarios, Playwright automation, and local JSON/Markdown reports                                                           |
