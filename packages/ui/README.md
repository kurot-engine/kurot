# @kurot/ui

**3.4.0 is published**, verified on npm on 2026-10-09. Its development
installation and lock resolve published Core 2.4.0 without local overrides. See
[centered flips](../../docs/centered-flips.md) for APIs and consumer adoption order.

UI component framework for [@kurot/core](https://github.com/kurot-engine/kurot/tree/main/packages/core). Migrated from Egret EUI, rewritten in modern TypeScript with clean class inheritance — no namespace hacks, no prototype manipulation.

> **Package version: 3.4.0 (published).** Requires `@kurot/core@^2.4.0`. Targets ES2022 + evergreen browsers, same as core.

For the full list of changes in this release, see [CHANGELOG.md](./CHANGELOG.md).

## Centered flips in 3.4.0

All UI display components inherit independent boolean `flipX` and `flipY`,
defaulting to false. They reflect content around the center of the validated
local layout rectangle, including empty space, while preserving position, size,
anchors and scale values. Percent resizing updates the center. Negative scale
keeps its existing anchor-based meaning and composes with a centered flip.

```ts
image.flipY = true;
image.percentWidth = 100;
image.percentHeight = 100;
```

Core 2.4.0 supplies the effective transform for rendering and input. The authored
`matrix` stays independent of the flags. Layout remains deferred; validate first
when reading coordinates or rendering manually. KUI authoring requires document
0.13.0 and CLI 3.5.0; materialized previews require runtime 0.10.0. Core 2.4.0,
UI 3.4.0, document 0.13.0, CLI 3.5.0 and runtime 0.10.0 are published. No existing skin is converted automatically.

## RichLabel in 3.3.0

```ts
import { RichLabel } from '@kurot/ui';

const message = new RichLabel([
	{ text: 'Important: ', style: { size: 20, bold: true, textColor: 0xff9900 } },
	{ text: 'all runs wrap together.', style: { size: 20, italic: true } },
]);
message.maxWidth = 240;
group.addChild(message);
```

RichLabel extends Component independently. Its content interface is `textFlow`,
with no whole-component Label text, color, font, fitting or preset properties.
It supports multiline layout, automatic bounds, parent constraints and alignment.
Assigned/read runs and styles are copied; reassign an edited snapshot to update.
See [RichLabel](docs/rich-label.md) for defaults, measurement and font readiness.
BitmapLabel now also honors maxWidth during automatic measurement. Both text
components remeasure automatic height when an authored width changes.

The unpublished UI 3.3.1 snapshot built and tested against registry Core 2.3.1.
Current UI 3.4.0 builds and tests against registry Core 2.4.0 without overrides.
These native APIs do
not add KUI tags or an Editor rich-text authoring interface by themselves.

## Label text fitting in 3.1.0

Single-line Labels can shrink their drawing size to fit the available region:

```ts
import { Label } from '@kurot/ui';

const amount = new Label('KZT 10 000,00');
amount.width = 140;
amount.size = 24;
amount.multiline = false;
amount.textFit = 'shrink';
amount.minFontSize = 16;
```

`size` stays authored; `renderedSize` and `textFitOverflow` are read-only results
after layout validation. Shorter text or larger bounds restore the base size.
Put a Button's fitting policy on its `labelDisplay` skin part, so icon spacing
and state overrides are respected. EditableText rejects shrinking; multiline
Labels retain their base size.

Label defaults to multiline, while explicit `multiline = false` displays one
unwrapped first line. Remove an old false flag or set it to true for text
intended to wrap. Files are not migrated automatically. Load fonts before
measurement; after late loading, call `label.invalidateSize()` to refresh
metrics even if the family name is unchanged.

See the [text layout and fitting contract](docs/label-text-layout.md). Fitting
metadata was introduced in document 0.9.0 and remains supported in 0.13.0.
Current CLI 3.5.0 and runtime 0.10.0 use document `^0.13.0`.
Runtime 0.10.0 also requires UI `^3.4.0` and Core `^2.4.0`. Programmatic UI depends
only on Core.

## Installation

```bash
pnpm add @kurot/ui@^3.4.0 @kurot/core@^2.4.0
```

`@kurot/ui` declares `@kurot/core` as a peer dependency. Install both packages explicitly so the application controls the resolved core version.

UI 3.4.0 requires Core ^2.4.0 for the centered-flip frame hook, in addition to
the native text APIs introduced in Core 2.2/2.3. Core installs its published
bitmap-font dependency automatically.
Refresh older Core/UI lockfiles and old sheet manifests with
string-valued `subkeys` in Kurot Editor before launching the application.
See the [resource migration guide](../ui-document/docs/resource-nine-slice.md).

## Project style colors

CLI 3.5.0 resolves Label presets and named colors from the optional
`resource/config/style.json` into native UI properties, including state overrides:

```xml
<Label id="labelDisplay" textColor="#FF9900"
       textColor.disabled="@style:colors:disabled-text" />
```

The Label belongs to a Skin declaring the `disabled` state. Native Skin state
handling applies the compiled numeric color and restores the base color on
leaving that state. The same reference syntax works for base color properties.
UI does not read style.json or evaluate XML references itself; programmatic
components assign numeric colors. This release does not introduce complete
typography presets or automatic live theme switching. See the
[project style contract](../ui-document/docs/project-styles.md).

## Quick Start

```ts
import { Group, Label, Button, Rect, BasicLayout } from '@kurot/ui';

const group = new Group();
group.layout = new BasicLayout();
group.width = 400;
group.height = 300;

const btn = new Button();
btn.label = 'Click Me';
btn.width = 120;
btn.height = 36;
btn.left = 20;
btn.top = 20;

// Manual skin: transparent hit area + visual children
btn.graphics.beginFill(0x000000, 0.01);
btn.graphics.drawRect(0, 0, 120, 36);
btn.graphics.endFill();

const bg = new Rect(120, 36, 0x6c5ce7);
btn.addChild(bg);

const lbl = new Label('Click Me');
lbl.width = 120;
lbl.height = 36;
lbl.textAlign = 'center';
lbl.verticalAlign = 'middle';
lbl.textColor = 0xffffff;
btn.labelDisplay = lbl;
btn.addChild(lbl);

group.addChild(btn);
```

## Architecture

Every UI component holds a `UIState` instance that manages the layout lifecycle. `Group` and `Component` delegate all layout calls to it — no mixin, no prototype copying.

```
Group / Component
  └── ui: UIState        ← layout state + invalidation logic
        └── owner: IUIOwner  ← back-reference to the DisplayObject
```

### Layout cycle

Property changes are batched and applied during the core ticker's
render-preparation phase:

```
invalidateProperties / invalidateSize / invalidateDisplayList
  → Validator queues the component
  → core ticker callLater queue (before rendering)
  → validateProperties  (shallow → deep,  commitProperties)
  → validateSize        (deep → shallow,  measure)
  → validateDisplayList (shallow → deep,  updateDisplayList)
```

Auto-sized skinnable components measure their skins in the component's local
coordinates. Scaling, rotation, and skew affect the bounds seen by the parent
layout once; they do not alter the component's measured width and height.
Explicit dimensions and skin minimum/maximum dimensions also use local units.

The 3.3.1 transformed-layout correction applies parent allocations to the
transformed rectangle, including negative scale on either axis. A flipped Image
with 100% width/height fills its parent allocation, rather than reverting to the
texture dimensions. This behavior is shared by Group and Component subclasses.
Local minima/maxima still apply; infeasible transformed aspect ratios fit within
the allocation when the local minimum dimensions permit it. Published UI 3.4.0
includes this repair alongside the independent centered-flip properties.

### Skin system

```ts
import { Rect, Skin, State, SetProperty } from '@kurot/ui';

class MyButtonSkin extends Skin {
	public bg: Rect;

	constructor() {
		super();

		this.bg = new Rect(120, 36, 0x6c5ce7);
		this.skinParts = ['bg'];
		this.elementsContent = [this.bg];
		this.states = [
			new State('up'),
			new State('down', [new SetProperty('bg', 'fillColor', 0x5a4bd1)]),
			new State('disabled', [new SetProperty('bg', 'fillColor', 0x636e72)]),
		];
	}
}

btn.skinName = MyButtonSkin;
```

### Typed skin parts and lifecycle

UI 2.0 attaches a skin atomically. The complete part set is available in
`onSkinReady()` and remains available through `onSkinRemoved()`. Accessing
`skinParts` outside that interval throws, which prevents code from silently
using a partial or stale skin.

The Kurot CLI generates `SkinPartsMap` entries and narrows the public
`skinParts` accessor on project classes. It resolves explicit string-literal
`skinName` assignments, configured reusable-component pairs, and unambiguous
`<ClassName>Skin` naming conventions. The runtime skin name remains the source
of truth whenever it is assigned explicitly:

```ts
import { TouchEvent } from '@kurot/core';
import { Component } from '@kurot/ui';

export class ConfirmPanel extends Component {
	public constructor() {
		super();
		this.skinName = 'game.ui.ConfirmPanelSkin';
	}

	protected override onSkinReady(): void {
		super.onSkinReady();
		this.skinParts.btnConfirm.addEventListener(TouchEvent.TOUCH_TAP, this.onConfirm);
		this.skinParts.lblMessage.text = 'Continue?';
	}

	protected override onSkinRemoved(): void {
		this.skinParts.btnConfirm.removeEventListener(TouchEvent.TOUCH_TAP, this.onConfirm);
		super.onSkinRemoved();
	}

	private onConfirm = (): void => {
		// Handle confirmation.
	};
}
```

Library code without CLI-generated host declarations can still select a shape
explicitly with `Component<'game.ui.ConfirmPanelSkin'>` or
`ItemRenderer<'game.ui.ConfirmItemSkin'>`. `skinParts` is the only public,
read-only part view, so component subclasses, mediators, and composition code
use the same API.

When a CLI project has exactly one compiled `<ClassName>Skin` candidate, the
generated host declaration also covers skins supplied externally by a Theme or
List. An `ItemRenderer` named `MultiplierIR` can therefore use
`this.skinParts` without repeating `ui.MultiplierIRSkin` in its base type.

Use `onSkinReady()` only for work that requires skin parts. Keep ordinary
one-time component initialization in `createChildren()`. Remove listeners and
other bindings created for a skin in `onSkinRemoved()` so replacing a skin
cannot retain stale objects.

The old incremental APIs `setSkinPart()`, `partAdded()`, and `partRemoved()`
were removed in 2.0. Skin part names are no longer copied onto the component as
dynamic properties; use `this.skinParts.<name>` during the ready lifecycle.

## Components

### Basic Controls

| Component      | Description                                                                     |
| -------------- | ------------------------------------------------------------------------------- |
| `Label`        | Text display. Wraps `TextField` in the UI lifecycle.                            |
| `RichLabel`    | Styled runs in one continuous TextField layout; independent textFlow content.   |
| `BitmapLabel`  | Bitmap-font display. Wraps BitmapText with font resources, layout and bindings. |
| `Button`       | Tappable button with `up`/`down`/`disabled` states and `labelDisplay` part.     |
| `CheckBox`     | Toggle button. Dispatches `Event.CHANGE` on selection change.                   |
| `RadioButton`  | Mutually exclusive toggle. Use `groupName` to link buttons.                     |
| `ToggleButton` | Base for toggle-style buttons.                                                  |
| `ToggleSwitch` | Binary on/off switch (visual variant of `ToggleButton`).                        |
| `ProgressBar`  | Value indicator. Inject `thumb` (a `Component`) as the fill part.               |
| `HSlider`      | Horizontal slider. Inject `thumb` and `track` skin parts; default range 0–100.  |
| `VSlider`      | Vertical slider. Inject `thumb` and `track` skin parts; default range 0–100.    |
| `Rect`         | Filled/stroked rectangle. Supports `fillColor`, `strokeColor`, `fillAlpha`.     |
| `Image`        | Bitmap display. Supports URL string or `Texture`, `scale9Grid`, `fillMode`.     |

Both sliders inherit Range's default `minimum = 0` and `maximum = 100`.
Set either bound explicitly when a control needs a different range.

### Text Input

| Component      | Description                                                                |
| -------------- | -------------------------------------------------------------------------- |
| `EditableText` | Editable text field with `prompt` (placeholder) and `promptColor` support. |
| `TextInput`    | Skinnable input component. Skin parts: `textDisplay`, `promptDisplay`.     |

### Containers

| Component   | Description                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------- |
| `Group`     | Base container. Holds a `LayoutBase` for child positioning. Implements `IViewport`.          |
| `Panel`     | Container with title bar. Skin parts: `titleDisplay`, `closeButton`, `moveArea` (draggable). |
| `ViewStack` | Shows one child at a time. Set `selectedIndex` or `selectedChild` to switch.                 |
| `Scroller`  | Touch-scrolling wrapper for any `IViewport`. Supports bounce, scroll bars, scroll policies.  |
| `UILayer`   | Full-screen overlay container.                                                               |

`Scroller` keeps its default `auto` scroll policies when scroll bars are hidden.
To hide a bar while retaining touch scrolling, set the bar's skin properties
`autoVisibility="false" visible="false"`. With the default `autoVisibility`,
the bar appears after a drag passes the touch threshold and hides after the
gesture. Set `visible="true" autoVisibility="false"` to keep a bar visible.

### Data-Driven

| Component      | Description                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------- |
| `DataGroup`    | Renders a data collection using item renderers. Supports virtual layout for large datasets.     |
| `List`         | `DataGroup` with tap-to-select. Dispatches `ItemTapEvent.ITEM_TAP`.                             |
| `TabBar`       | Horizontal tab strip driven by `dataProvider`. Dispatches `ItemTapEvent.ITEM_TAP`.              |
| `ComboBox`     | Drop-down selector. Tapping toggles a `list` skin part; dispatches `Event.CHANGE` on selection. |
| `ItemRenderer` | Base class for custom item renderers. Override `dataChanged()` to update visuals.               |

### Scroll Bars

| Component    | Description                                               |
| ------------ | --------------------------------------------------------- |
| `HScrollBar` | Horizontal scroll bar. Bind to a viewport via `viewport`. |
| `VScrollBar` | Vertical scroll bar. Bind to a viewport via `viewport`.   |

## Layouts

| Layout             | Description                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `BasicLayout`      | Positions children using `left`/`right`/`top`/`bottom`/`horizontalCenter`/`verticalCenter` and `percentWidth`/`percentHeight`. |
| `VerticalLayout`   | Linear vertical arrangement with gap, padding, alignment, percent sizes, and virtual layout support.                           |
| `HorizontalLayout` | Linear horizontal arrangement with gap, padding, alignment, percent sizes, and virtual layout support.                         |
| `TileLayout`       | Grid arrangement with configurable orientation, column/row counts, justification, and virtual layout support.                  |

## Data Collections

```ts
import { ArrayCollection } from '@kurot/ui';

const data = new ArrayCollection(['Apple', 'Banana', 'Cherry']);

data.addItem('Durian');
data.addItemAt('Elderberry', 1);
data.removeItemAt(0);
data.replaceItemAt('Fig', 0);
data.sort((a, b) => String(a).localeCompare(String(b)));
data.filterFunction(item => item !== 'Fig');
data.refresh(); // notify view after manual source changes

const records = new ArrayCollection([{ name: 'Pear' }, { name: 'Apple' }]);
records.sortOn('name'); // sort records by field
```

## Virtual Layout

For large datasets, enable virtual layout so only visible renderers are created:

```ts
import { List, ItemRenderer, ArrayCollection, Label } from '@kurot/ui';

class MyRenderer extends ItemRenderer {
	private _label: Label;
	constructor() {
		super();
		this._label = new Label('');
		this._label.width = 200;
		this._label.height = 36;
		this.addChild(this._label);
	}
	protected override dataChanged(): void {
		this._label.text = String(this.data ?? '');
	}
}

const list = new List();
list.dataProvider = new ArrayCollection(largeArray);
list.itemRenderer = MyRenderer;
list.useVirtualLayout = true; // only visible renderers are instantiated
list.width = 200;
list.height = 300; // visible window height
list.scrollEnabled = true;
```

## Constraint Properties

All UI components support these layout constraint properties:

```ts
component.left = 20;
component.right = 20;
component.top = 10;
component.bottom = 10;
component.horizontalCenter = 0;
component.verticalCenter = 0;
component.percentWidth = 50;
component.percentHeight = 100;
```

## View States

```ts
import { Label, Rect, Skin, State, SetProperty } from '@kurot/ui';

class StatefulButtonSkin extends Skin {
	constructor() {
		super();
		const bg = new Rect(120, 36, 0x6c5ce7);
		const labelDisplay = new Label();
		labelDisplay.textColor = 0xffffff;
		labelDisplay.horizontalCenter = 0;
		labelDisplay.verticalCenter = 0;
		this.setPart('bg', bg);
		this.setPart('labelDisplay', labelDisplay);
		this.skinParts = ['labelDisplay'];
		this.elementsContent = [bg, labelDisplay];
		this.states = [
			new State('up'),
			new State('down', [new SetProperty('bg', 'fillColor', 0x5a4bd1)]),
			new State('disabled', [
				new SetProperty('bg', 'fillColor', 0x636e72),
				new SetProperty('labelDisplay', 'textColor', 0xb2bec3),
			]),
		];
	}
}
```

Button selects `up`, `down` or `disabled` through its native behavior. Each
state restores the previous property values before applying the next overrides.
CLI-built skins generate the same `State`/`SetProperty` objects from XML
attributes such as `textColor.disabled`.

## Events

| Event                               | Dispatched by                                                    | Description                                                        |
| ----------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `Event.CHANGE`                      | `List`, `TabBar`, `ComboBox`, `CheckBox`, `RadioButton`, `Range` | Selection or value changed (user interaction only for List/TabBar) |
| `ItemTapEvent.ITEM_TAP`             | `List`, `TabBar`                                                 | Item tapped. Has `item`, `itemIndex`, `itemRenderer`               |
| `CollectionEvent.COLLECTION_CHANGE` | `ArrayCollection`                                                | Data added, removed, replaced, reset                               |
| `UIEvent.CLOSING`                   | `Panel`                                                          | Close button tapped (cancelable)                                   |
| `UIEvent.CREATION_COMPLETE`         | Any `Component`                                                  | First `createChildren` completed                                   |

## UI Benchmark

The UI package includes three deterministic browser workloads: a 400-node
static skin, transform/alpha animation across 240 UI nodes, and a 10,000-record
virtual list. They measure frame/render time, draw calls, validation-phase
activity, and ItemRenderer creation/reuse.

Validation counters cover measured frames. Renderer creation/reuse and maximum
live-renderer counts cover the complete scenario, including warmup, so the
report can distinguish a stable pool from per-frame renderer churn.

The first complete Chromium run used 60 warmup frames and 300 measured frames:

| Workload                           |   Setup | Frame P95 | Render P95 | Draw calls | UI lifecycle result                        |
| ---------------------------------- | ------: | --------: | ---------: | ---------: | ------------------------------------------ |
| 400-node static image UI           | 8.50 ms |  10.20 ms |    0.20 ms |          1 | No repeated validation after stabilization |
| 240-node transform/alpha animation | 3.90 ms |  10.00 ms |    0.30 ms |          1 | No measure or display-list validation      |
| 10,000-record virtual list         | 6.90 ms |   9.90 ms |    0.50 ms |          5 | 19 renderers created and at most 19 live   |

The transform workload recorded 72,000 `commitProperties` calls: 240 moving UI
nodes × 300 measured frames. Multiple property changes on the same component
were coalesced to one property commit per frame. Under the current UI contract,
position changes participate in parent layout/content-bound invalidation, so
this is expected bookkeeping rather than 72,000 measurements, layouts, texture
uploads, or draw calls. The workload still remained one draw call and triggered
zero `measure` and zero `updateDisplayList` calls during measurement.

These results show that the core batching path reaches the UI layer, stable UI
does not continue validating, and virtual layout bounds renderer population by
the visible window. They are scoped results from one Chromium environment, not
a cross-device performance guarantee or a comparison with another UI framework.

```sh
pnpm benchmark
pnpm benchmark:smoke
pnpm benchmark:compare
```

`benchmark` starts the visual page at `/benchmark/`. `benchmark:smoke` verifies
all scenarios quickly, while `benchmark:compare` runs 60 warmup and 300 measured
frames per scenario and writes local JSON/Markdown results under
`examples/benchmark/results/`. This is a Kurot UI self-baseline, not a
cross-framework ranking.

## Differences from Egret EUI

|                | Egret EUI                   | @kurot/ui                                                   |
| -------------- | --------------------------- | ----------------------------------------------------------- |
| Namespace      | `eui.*` global              | ES Module named exports                                     |
| Component base | `namespace` + `mixin`       | Standard class inheritance                                  |
| Layout state   | Prototype-injected          | `UIState` delegation                                        |
| Authored skins | EXML runtime parser         | KUI XML compiled by `@kurot/cli`                            |
| Skin parts     | Incremental dynamic fields  | Atomic typed `skinParts`                                    |
| Skin lifecycle | `partAdded` / `partRemoved` | `onSkinReady` / `onSkinRemoved`                             |
| `thisObject`   | Required in event listeners | Not needed — use arrow functions                            |
| Virtual layout | Default on                  | Opt-in via `useVirtualLayout = true`                        |
| i18n           | Built-in                    | Project-managed translations; Core handles Unicode wrapping |

## Bitmap labels in 3.2.0

[BitmapLabel](docs/bitmap-label.md) wraps Core BitmapText with native UI layout,
spacing, alignment and configured font-resource names:

```ts
import { BitmapLabel } from '@kurot/ui';

const amount = new BitmapLabel('1,234.56');
amount.font = 'number_font_fnt';
amount.multiline = false;
amount.height = 100;
group.addChild(amount);
```

Register the font descriptor in Core's resource configuration before assigning
its name, or assign a BitmapFont directly. The label borrows its font; the
resource cache or caller retains ownership. Superseded async requests cannot
replace a newer assignment. Successful named loads dispatch Event.COMPLETE;
failed or incorrectly typed resources dispatch IOErrorEvent.IO_ERROR.

The component supports native code and programmatic skins. Installed KUI
compilers, the ui-document catalog, Editor and ui-runtime materializers do not
yet adopt the BitmapLabel tag. Published UI 3.1.0 does not include the component.
