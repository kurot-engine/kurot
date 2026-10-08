# @kurot/ui architecture

> Package version: 3.3.1, with peerDependency `@kurot/core: ^2.3.0`.
> Core 2.3.1 is published and installed from npm without local overrides.
> See [CHANGELOG.md](../CHANGELOG.md) for release-by-release changes.
> The [AI context map](./ai-context.md) provides directory, behavior, terminology
> and task-to-file references. This document explains design decisions and internal
> mechanisms for human readers; the two documents complement each other.
> Version 3.3.0 also exports independent [RichLabel](./rich-label.md).
> Version 3.2.0 introduced BitmapLabel for native code and programmatic skins.
> See [bitmap-label.md](./bitmap-label.md) for its resource and ownership contract.

---

## 1. Overview

`@kurot/ui` is an EUI-compatible UI framework rewritten on top of
[`@kurot/core`](../../core/docs/architecture.md). Core is a `peerDependency`,
excluded from the output bundle. Consumers explicitly install it so packages
using UI share one Core instance, display tree infrastructure and global state.

The central architectural choice is delegation in place of prototype mixins.
Egret EUI uses `implementUIComponent()` to copy prototype members and combine
DisplayObject and UIComponent behavior. Such copied members are difficult to
represent in strict TypeScript. Kurot uses composition instead: Group and
Component both directly extend Sprite and hold a UIState instance as `this.ui`.
Their IUIComponent methods delegate layout state and validation to UIState.
UIState communicates with its host through the narrow IUIOwner callback interface,
without depending on the host's concrete DisplayObject subclass. This separation
allows skin and validation systems to evolve independently and follows the
repository preference for composition over deeper application inheritance.

---

## 2. Validation cycle

### 2.1 Three phases and three queues

Layout updates are deferred and batched. Property changes enqueue components
for Core's render-preparation `callLater` queue instead of immediately repeating
layout work for each change within a frame.

The Validator singleton (`validator`) maintains three DepthQueues:
`_propsQueue`, `_sizeQueue` and `_displayQueue`. Each groups clients by
`$nestLevel`, a Core DisplayObject field, using `Map<number, DepthBin>`.
Each DepthBin combines an array for ordered removal with a Set for constant-time
duplicate checks.

The phases execute in a fixed order with different traversal directions:

```text
validateProperties()   shallow → deep   commitProperties()
validateSize()         deep → shallow   measure()
validateDisplayList()  shallow → deep   updateDisplayList()
```

These directions follow the data dependencies:

- Properties commit from parent to child. For example, List assigns data to a
  renderer before the renderer measures its text. Children added or removed
  during a parent commit can participate in the same queue processing.
- Size measurement runs from child to parent. Container measurements depend
  on child dimensions, whether VerticalLayout sums them or BasicLayout unions bounds.
- Display-list updates run from parent to child. A parent first assigns child
  layout bounds through setLayoutBoundsSize/setLayoutBoundsPosition; the child
  can then finalize its display using the allocated bounds.

DepthQueue.shift() tracks the shallowest bucket with `_min`; pop() tracks the
deepest with `_max`. Removing clients advances these cursors rather than scanning
from the beginning on each call. New insertions can adjust the bounds again.

### 2.2 Restarting after a later invalidation

Separate phases create a dependency problem: processing one client can invalidate
another client whose earlier phase has already run. A single pass may leave such
an invalidation pending even though it belongs to the same logical update.

`validateClient(target)` handles this for forced synchronous validation, such as
re-adding a removed component to the stage or calling component.validateNow():

1. Set `_targetLevel` to target.$nestLevel when it is currently Infinity. Nested
   calls retain the existing level and restore it afterward.
2. Run an outer `while (!done)` loop:
    - Remove clients from the target subtree's properties queue from shallow to
      deep and call validateProperties. Check obj.stage before each call to skip
      objects removed from the stage during validation.
    - Process the subtree's size queue from deep to shallow. If measurement sets
      `_clientPropsFlag` and a pending property client exists in the subtree,
      reinsert that client, set done=false and break. The outer loop restarts at
      properties before proceeding to display-list updates.
    - Apply the same restart logic in the display-list phase for both
      `_clientPropsFlag` and `_clientSizeFlag`.
3. In finally, restore `_targetLevel`, synchronize empty-queue flags and clear
   client flags. Validator.test.ts covers consistency after a client throws.
4. Client flags are raised when an invalidated client's depth is at least
   `_targetLevel`. Queue removal then checks actual ancestry to select clients
   in the target subtree. Outside validateClient, `_targetLevel` is Infinity,
   so ordinary clients do not raise these flags.

The deferred path, `_schedule()` → `_flush()`, is simpler: it runs properties,
size and display-list queues once each across the tree, using shift/pop, without
the synchronous restart loop. If flags remain afterward, it schedules another
callLater. Cascading invalidations can therefore require later deferred flushes;
validateClient instead converges synchronously for its target subtree.

### 2.3 Ordering before rendering

`_schedule()` uses Core's ticker.callLater() to schedule `_flush()`. Core executes
flushCallLaters() before Player.render(), so initial property commits, measurement
and layout run before newly mounted components are drawn. This provides the
render-preparation ordering that Egret's Validator establishes through
Event.RENDER, without independent UI and renderer RAF loops competing for order.

---

## 3. Skin system

### 3.1 Skin is a data object

`components/Skin.ts` defines Skin as an EventDispatcher<SkinEvents>, rather than
a display object. Egret EUI's Skin also extends EventDispatcher; its nonvisual
role is shared with Kurot.

Skin declares skinParts (names), states (State entries) and elementsContent
(display objects to attach). Component._setSkin() performs the attachment:
elementsContent children are added directly to the host Component, and Skin
itself never appears in the display tree. This keeps the skin's configuration
and state role separate from the Component's visual-host role.

### 3.2 Theme loading

```text
new Theme(url)
  → setTheme(this)                  synchronously register before loading completes
  → _load(url)                      adapter.getTheme(url, onSuccess, onError)
      → _onConfigLoaded(raw)        parse JSON and merge skins/styles
          → if skinsJs is present
              → _loadSkinsModule()  dynamically import compiled skins
          → _onLoaded()             mark initialized, handle _delayList, emit COMPLETE
      → failure → _onLoadFailed()   mark initialized and handle _delayList,
                                    then emit IOErrorEvent.IO_ERROR
```

Theme.ts uses an inline `_defaultThemeAdapter` backed by XMLHttpRequest unless
a custom adapter is passed to the constructor. The separately exported
DefaultThemeAdapter in `core/DefaultThemeAdapter.ts` uses fetch and is activated
only when the caller creates and supplies it. These two implementations do not
share loading logic, so changes to default-adapter behavior must account for
both paths.

### 3.3 Compiled skin factories and global registration

When CLI compiles KUI XML skins, its theme index module performs registrations
equivalent to:

```js
import { createButtonSkin as s0 } from './skin0.js';
globalThis['skins.ButtonSkin'] = s0;
```

Theme._loadSkinsModule() resolves skinsJs relative to the theme configuration URL
and dynamically imports it. By the time that import promise resolves, the module
has registered its skin factories on globalThis.

Component._parseSkinName() resolves a string skinName through
`(globalThis as Record<string, unknown>)[skinName]`. The complete flow is:

```text
CLI-generated module   globalThis["skins.X"] = factory   import side effect
Theme configuration    hostComponentKey → "skins.X"      string mapping
Component skin setup   globalThis["skins.X"]              factory lookup
```

There is no separate registry object. Skin names occupy a global namespace:
if two themes use the same name, such as skins.ButtonSkin, the later-loaded
factory overwrites the earlier registration.

### 3.4 Components created before the theme is ready

Game code can construct the UI tree before the theme request finishes.
If Component.createChildren() has no explicit skinName, it asks the global
Theme for a default:

- While the theme is uninitialized, getSkinName() puts the component into the
  deduplicated `_delayList` and returns an empty string. The component starts
  without a skin.
- On loading completion or failure, `_handleDelayList()` revisits components
  whose skinName has not been set explicitly. It resolves available skin names
  and calls component._applySkinName(), causing validation of the applied skin.

An early-created component can render without its skin until theme loading,
including the skinsJs import, finishes. This follows EUI's asynchronous-theme
pattern and decouples UI-tree construction from theme loading.

### 3.5 Replacing a skin

_parseSkinName() dispatches by skinName type: a function is invoked as a factory
or constructor; a string is resolved through globalThis; an object is used as
a Skin instance.

_invokeSkinFactory() tests `/^class\s/.test(Function.prototype.toString.call(fn))`
to distinguish ES class constructors, invoked with new, from compiled KUI
factories, invoked with fn.call(this) to supply the host context.

_setSkin(skin) follows this lifecycle:

1. Detach the old skin: call onSkinRemoved() while its complete skinParts map
   remains available, mark it unready and clear the map, set
   oldSkin.hostComponent=undefined to exit its state, call oldSkin.unwatchAll()
   to remove Watchers, and detach elementsContent from the host.
2. Attach the new skin: collect declared parts through skin.getPart(name) into
   the internal map, add elementsContent to the host in declaration order,
   set currentState and hostComponent, mark the skin ready and call onSkinReady().
   The Component instance does not acquire dynamic properties for those part names.
3. Invalidate size and display list, then dispatch Event.COMPLETE on the Component.

---

## 4. View states and overrides

### 4.1 State transitions remove and reapply overrides

IOverride defines apply(host, skin) and remove(host, skin).
Skin._applyState(fromState, toState) follows this algorithm:

```text
oldState = states.find(s => s.name === fromState)
if present: call override.remove(host, this) for every oldState override

newState = states.find(s => s.name === toState)
if present: call override.apply(host, this) for every newState override
```

It does not compute the difference between override lists. Even a shared override
instance is removed and reapplied. SetProperty/SetStateProperty may restore a
value and immediately set it again. AddItems can remove and reinsert an object,
with possible z-order changes unless its placement is fully specified.
Developers expecting only changed overrides to execute must account for this.

### 4.2 Override behavior

- SetProperty targets a skin part, or Skin itself for an empty target. apply()
  saves `_oldValue` and assigns the new value. remove() restores it only when
  `_applied` is true.
- SetStateProperty uses the same save/restore pattern on the host Component,
  through host[name]=value. It changes public host behavior, such as enabled,
  rather than a named skin part.
- AddItems moves a display object into a destination container, defaulting to the
  host, at the specified position. remove() detaches it only if item.parent===dest,
  preserving an object that other logic has since moved elsewhere.

### 4.3 Separate Skin and Group state machines

Group has no attached Skin, so `_commitCurrentState()` implements similar
apply/remove logic using `_states`, `_statesMap` and `_currentState`.
It passes Group as both roles using
`override.apply(this as unknown as Component, this as unknown as Skin)`.
The signature assumes separate Component and Skin objects, while Group has only
itself. Host-property overrides can use this arrangement; code that requires
real Skin APIs such as getPart() must not assume that Group provides them.

The duplicated transition logic and casts are a known coupling point. A shared
transition helper could reduce the duplication, but no such extraction is
currently implemented.

---

## 5. Layout system

### 5.1 Measurement and display-list contracts

LayoutBase defines the two operations implemented by concrete layouts:

- measure() runs from deep to shallow. It uses each child's getPreferredBounds()
  to determine the container's preferred dimensions and reports them through
  target.setMeasuredSize(w, h).
- updateDisplayList(width, height) runs from shallow to deep, receiving allocated
  dimensions that can differ from measured dimensions because of parent
  constraints. It assigns participating children through setLayoutBoundsSize()
  and setLayoutBoundsPosition(), then reports occupied dimensions with
  target.setContentSize(w, h) for scrolling/viewport calculations.

ILayoutTarget is the minimal container interface used by layout algorithms:
numChildren, getChildAt, scrollH, setMeasuredSize and related operations.
Group and Component both implement it. Layouts such as BasicLayout and
VerticalLayout can be assigned to Group.layout; Component internally reuses a
shared BasicLayout for measurement and display-list updates by temporarily
setting its target. Component's skin measurement uses unscaled preferred bounds,
so the host's transform is applied by its parent rather than counted twice.

Layouts skip children that do not implement the UI layout contract or have
includeInLayout=false. This excludes an element from layout without requiring
its removal from the display tree. State membership that changes display-tree
attachment is handled separately by AddItems.

### 5.2 Percentage dimensions

BasicLayout resolves left/right/top/bottom, horizontalCenter/verticalCenter and
percentWidth/percentHeight. When both edge constraints on an axis are set, they
fix that dimension: width becomes unscaledWidth-right-left, taking precedence
over percentWidth. Percentage sizing applies when the two edge constraints do
not both determine the dimension.

The fmt() helper parses string constraints such as `left="10%"` in KUI XML.
A trailing percent sign selects percentage calculation; otherwise the value is
converted to a number. There is no separate runtime type tag for percentages
versus pixels.

The 3.3.1 transform-allocation correction uses
`core/fit-transformed-bounds.ts` from UIState. Allocated dimensions describe the
parent-space rectangle, while explicit, preferred and minimum/maximum sizes stay
local. The solver uses the absolute linear matrix coefficients to obtain that
rectangle's width and height. Anchors and translation affect only its position.
It fills both requested axes when possible, otherwise chooses the largest local
rectangle contained by the allocation. Local minimum sizes take precedence if
no contained rectangle can satisfy them. With one allocated axis, an authored
single local dimension is retained when possible; the unconstrained parent extent
is minimized otherwise. Unallocated transforms preserve local measurement.

UIState also maps the allocation flags to the affected local axes. A quarter-turn
width allocation controls local height, so reading height must retain the fitted
value rather than restoring the authored height. A zero scale column keeps its
natural local dimension without division by zero. Group and Component share
this behavior, including Image, text, buttons and other component subclasses.

LinearLayoutBase.flexChildrenProportionally(), shared by VerticalLayout and
HorizontalLayout, iteratively allocates percentages with min/max constraints.
A do...while loop identifies children whose proportional allocation exceeds a
bound, clamps them and removes them from the remaining allocation pool using
in-place partition swaps. It subtracts their percentage shares and redistributes
the remainder. One division is insufficient because clamping a child changes
the effective shares of the others. This follows the Flex-style percentage
allocation algorithm.

### 5.3 Gaps and padding

LinearLayoutBase owns gap and paddingLeft/Right/Top/Bottom; setters invalidate
the target layout. VerticalLayout/HorizontalLayout subtract
(numElements-1)*gap before allocation, then add gaps during positioning.
TileLayout maintains separate horizontalGap/verticalGap and padding fields.
It extends LayoutBase directly, so these accessors are implemented independently
of LinearLayoutBase.

### 5.4 Virtual layout

Virtual layout is disabled by default. Enable it explicitly through
layout.useVirtualLayout or the corresponding DataGroup/List property.
It lets List/DataGroup instantiate renderers only for the visible range when
handling thousands of records:

- LinearLayoutBase's protected elementSizeTable stores the last known axis size
  by data index, rather than display-child index. NaN means unknown, estimated
  using typicalWidth/typicalHeight, initially 71 × 22.
- elementAdded(index)/elementRemoved(index) keep the size table synchronized with
  ICollection changes without requiring full remeasurement.
- getStartPosition(index) accumulates preceding sizes to obtain an offset.
  findIndexAt uses recursive binary search to map scroll positions to visible indices.
- updateDisplayListVirtual() visits only startIndex..endIndex. It calls
  target.setVirtualElementIndicesInView(startIndex, endIndex), which lets
  DataGroup recycle and instantiate renderers for that range.
- measureVirtual() estimates total scrollable size from getElementTotalSize()
  and a correction based on visible elements, without instantiating every
  off-screen record.
- TileLayout uses scrollH/scrollV and fixed column/row strides, including gaps,
  to determine the visible range through _getIndexInView(). Uniform cells make
  this simpler than variable-size linear virtualization.

LayoutBase.getElementIndicesInView() returns an empty array by default.
TileLayout overrides it to expose the currently calculated range.
VerticalLayout/HorizontalLayout use protected getIndexInView() methods for their
internal calculations and do not override that public query. New layouts must
explicitly connect range calculation, viewport invalidation and renderer
materialization; overriding the public query alone does not drive virtual layout.

---

## 6. Component hierarchy

### Component subclasses

Component is the visual host for skinnable controls, delegating skin states to
Skin and layout/validation state to UIState. The table lists its descendants,
including intermediate base classes.

| Class                               | Responsibility                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| `Component`                         | Base for skinnable components: skin lifecycle, view states, constraints and validation delegation |
| `Rect`                              | Rectangle graphics with fill and stroke                                                           |
| `Image`                             | Displays bitmap data resolved through IAssetAdapter                                               |
| `Label`                             | Text display wrapping one TextField                                                               |
| `BitmapLabel`                       | Bitmap-font label wrapping one BitmapText; requires Core 2.2.0 or later                           |
| `RichLabel`                         | Independent Component with textFlow content and pure, cached TextField measurement                |
| `EditableText extends Label`        | Editable text with prompt support                                                                 |
| `Button`                            | Clickable up/down/disabled states; toggle enables automatic selected changes                      |
| `ToggleButton extends Button`       | Defaults toggle to true and toggles selection on click                                            |
| `CheckBox extends ToggleButton`     | Toggle behavior whose appearance is defined by its skin                                           |
| `RadioButton extends ToggleButton`  | Mutually exclusive selection through RadioButtonGroup                                             |
| `ToggleSwitch extends ToggleButton` | Skin variant presenting a sliding switch                                                          |
| `Range`                             | Bounds values to minimum/maximum with optional snapInterval; base for sliders                     |
| `SliderBase extends Range`          | Abstract dragging behavior for thumb/track skin parts                                             |
| `HSlider extends SliderBase`        | Horizontal slider, increasing left to right                                                       |
| `VSlider extends SliderBase`        | Vertical slider, increasing bottom to top                                                         |
| `ScrollBarBase`                     | Binds thumb movement to a viewport's scroll position                                              |
| `HScrollBar extends ScrollBarBase`  | Horizontal scrolling through scrollH                                                              |
| `VScrollBar extends ScrollBarBase`  | Vertical scrolling through scrollV                                                                |
| `ProgressBar`                       | Displays progress through a clipped thumb using scrollRect, with label formatting                 |
| `TextInput`                         | Text input with prompts and password masking                                                      |
| `Panel`                             | Skinnable container with optional title bar, close button and drag area                           |
| `Scroller`                          | Wraps an IViewport, usually Group, and manages touch scrolling and scrollbars                     |
| `ComboBox`                          | Dropdown selection with a trigger button and popup list                                           |
| `ItemRenderer`                      | Data-driven item renderer base for DataGroup/List/TabBar                                          |

### Group subclasses

Group is a container without a skin. It owns a lightweight state machine and a
pluggable LayoutBase.

| Class                        | Responsibility                                                                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `Group`                      | Participates in validation and delegates child positioning to LayoutBase; maintains its own state machine, as described in section 4.3 |
| `DataGroup extends Group`    | Converts ICollection records into renderers and maintains a reusable pool for virtual layout                                           |
| `ListBase extends DataGroup` | Adds selectedIndex/selectedItem and requireSelection semantics                                                                         |
| `List extends ListBase`      | Adds touch selection by clicking renderers                                                                                             |
| `TabBar extends ListBase`    | Selectable tabs with requireSelection=true by default                                                                                  |
| `ViewStack`                  | Stacked navigation container showing one child at a time; implements ICollection                                                       |
| `UILayer`                    | Top-level container following stage dimensions through RESIZE events                                                                   |

### Supporting classes

| Class              | Responsibility                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| `Skin`             | Nonvisual EventDispatcher declaring skinParts/states/elementsContent; see section 3                   |
| `RadioButtonGroup` | EventDispatcher tracking mutually exclusive RadioButtons under a groupName and emitting PropertyEvent |
| `TouchScroll`      | Inertial touch-scroll physics used by Scroller                                                        |
| `Animation`        | Numeric easing used by TouchScroll, driven by Core's ticker                                           |

---

## 7. Relationship to Egret EUI

| Egret EUI concept                                      | Kurot UI counterpart                                      | Notes                                                                                                                                                                          |
| ------------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `eui.Component`                                        | `Component`                                               | Same role; UI behavior uses standard Sprite inheritance and explicit delegation rather than prototype mixins                                                                   |
| `eui.Skin`                                             | `Skin`                                                    | Both are nonvisual EventDispatcher objects; their content is attached to the host component                                                                                    |
| Three-phase UIComponent validation                     | `UIState` + `Validator`                                   | Depth-ordered properties, measurement and display-list phases; Kurot uses Core's callLater queue before rendering where Egret uses Event.RENDER                                |
| Theme adapters and theme registration                  | `IThemeAdapter` + `Theme`/`getTheme()`/`setTheme()`       | Both support theme adapters; Kurot injects the adapter through the Theme constructor, while the Egret reference resolves eui.IThemeAdapter through its implementation registry |
| Global registration of compiled EXML skins             | `globalThis["skins.X"] = factory` from ESM imports        | Both use global skin names; Kurot's compiled output registers factories invoked with .call(this) to provide host context                                                       |
| State/SetProperty/SetStateProperty/AddItems            | Same class names and IOverride interface                  | Direct adaptation of declarative state overrides                                                                                                                               |
| BasicLayout/VerticalLayout/HorizontalLayout/TileLayout | Same class names                                          | Similar percentage allocation, gaps, padding and virtual-layout algorithms, including iterative min/max clamping                                                               |
| Prototype-copy UIComponent implementation              | TypeScript inheritance + UIState/ILayoutTarget delegation | The central architectural change described in section 1                                                                                                                        |

Kurot-specific choices include the IUIOwner/UIState composition boundary,
constructor-based Theme adapter injection and ESM skin factories with explicit
host context. UIState can exist independently of a specific DisplayObject
subclass; Group and Component each hold an instance rather than requiring a
shared visual base class for all validation state.

---

## 8. Test coverage

Tests are grouped under `test/`. Run `pnpm --dir packages/ui test` for current
file and case counts.

| Area                                   | Test files                                                                                                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Validation / theme infrastructure      | sanity, Theme, Validator                                                                                                                       |
| Skins and states                       | Skin, SkinAlignment (real CLI template skins), SkinMeasurement, AddItems                                                                       |
| Data binding                           | Binding, Watcher                                                                                                                               |
| Collections and data-driven components | ArrayCollection, DataGroup, ListBase, ItemRenderer, ComboBox, TabBar, ViewStack                                                                |
| Individual components                  | RadioButton, Range, Slider, ProgressBar, Scroller, Label, BitmapLabel, RichLabel, TextInput                                                    |
| Text fitting                           | ButtonLabelTextFit, LabelTextFit, LabelTextFitBounds                                                                                           |
| Cross-component behavior               | Enabled (EUI-aligned enabled/touchEnabled/touchChildren behavior), EventMapOverride, GestureLifecycle, TransformLayout, ScrollAndVirtualLayout |

There is no dedicated Group.test.ts; Group state behavior is covered indirectly
by container/component tests. There are also no separate VerticalLayout.test.ts
or TileLayout.test.ts files. Layout behavior is exercised by component and
integration tests such as TransformLayout, Scroller, SkinAlignment,
SkinMeasurement and ScrollAndVirtualLayout. Dedicated state-machine and layout
algorithm tests remain useful areas for additional coverage.

`examples/benchmark/` provides real Chromium performance checks for a 400-node
static UI, 240-node transform/alpha animation and a virtual list with 10,000 records.
It records frame/render time, draw calls, validation-phase calls and ItemRenderer
creation/reuse. It is a regression baseline for this UI implementation, rather
than a ranking across UI frameworks.

### Text component browser validation

Build Core and UI, then run `pnpm test:text-labels` from this package. The fixture
bundles built ESM with minification and keepNames=false, verifies actual pixels
through Canvas 2D, WebGL 1 and WebGL 2, and checks automatic bounds, edits and
empty content. Browser screenshots go to ignored test-results, not the package.
