# @kurot/ui

**3.6.2 is published, verified on npm on 2026-10-18.** It bundles the standard
UI production/directory guide, complete ScoreHUD recipe and versioned API
reference. npm latest, package download and SHA-512 integrity are verified;
all 344 runtime and 5,165 API files match the tested build. Runtime behavior,
Core ^2.5.2 requirements and the registry Core 2.5.3 development lock are unchanged.
See [Label layout](docs/label-text-layout.md) for the inherited 3.6.0 outline fix.

UI component framework for [@kurot/core](https://github.com/kurot-engine/kurot/tree/main/packages/core). Migrated from Egret EUI, rewritten in modern TypeScript with clean class inheritance — no namespace hacks, no prototype manipulation.

> **Package version: 3.6.2 (published; verified on 2026-10-18).** Documentation-only patch over 3.6.1. Requires `@kurot/core@^2.5.2`. Targets ES2022 + evergreen browsers, same as core.

## API reference since 3.6.1

Start with [API topics](docs/api/topics.md) or the [symbol index](docs/api/index.md),
then open only the relevant widget/member pages. Public and protected extension
contracts are labeled separately; [coverage](docs/api/coverage.md) records
remaining behavioral-comment gaps. These generated docs and strict-compiled
examples are included in published UI 3.6.1; the 3.6.0 artifact remains unchanged.
Runtime code, signatures and exports are unchanged. The Core
peer/dev range remains ^2.5.2; ui-runtime's UI ^3.4.0 peer already accepts 3.6.2.
No dependent release, raised minimum or application migration is required.

For building game UI, start with [standard authoring](docs/ui-authoring.md) and
the [complete ScoreHUD pair](docs/recipes/score-hud.md). They define project
directories, editable XML versus component/controller ownership, typed parts
and cleanup. These guides are included in published UI 3.6.2
(see the [publication record](../../docs/release-history.md)). Published 3.6.1
contains API references but lacks these additions. CLI 3.6.1 fixes generated
host declarations for `tsc --noEmit --skipLibCheck false`; the UI runtime is unchanged.

Outlined Label sizes and line breaks can change, including without `textFit`;
Scroller viewports need no extra configuration. Keep explicit top alignment for
progressively typed dialogue. No new KUI field, Core release or unrelated SDK
bump is required. Applications must adopt UI 3.6.0 and rebuild
to receive the correction.

For the full list of changes in this release, see [CHANGELOG.md](./CHANGELOG.md).

## Text alignment inherited from Core

Label, RichLabel and EditableText inherit TextField's default alignment;
BitmapLabel inherits BitmapText's. With published Core 2.5.3 they default to middle.
Published Core 2.5.2 and earlier default to top. Explicit top/bottom and skin-state
overrides stay effective; multiline only controls line generation. Set top
explicitly when text should start at the top of a taller box.
UI 3.4.0's existing peer range accepts Core 2.5.3 without a UI release or a higher
minimum for that default change alone. Applications adopt the Core installation/lock
and rebuild. UI 3.6.0's separate outline correction requires Core ^2.5.2;
the development installation is registry Core 2.5.3.
See [text layout](docs/label-text-layout.md#vertical-alignment-and-skin-defaults).

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
Published UI 3.5.0 was tested against Core 2.4.0; UI 3.6.0 builds and tests against
registry Core 2.5.3 and separately verifies its 2.5.2 minimum. Native KUI support
for RichLabel and BitmapLabel is available with ui-document >= 0.12.0, CLI >= 3.4.0
and ui-runtime >= 0.9.0. The current document 0.13.1, CLI 3.6.0 and runtime 0.10.0
retain that support; authoring applications adopt these packages separately.

## Label text fitting in 3.5.0

Labels can shrink their drawing size to fit the available region. UI 3.5.0
supports both single-line and multiline fitting; UI 3.1.0–3.4.0 fit only
single-line Labels:

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
and state overrides are respected. EditableText rejects shrinking.

For a multiline caption, keep `multiline = true` (the default), set width and
height on the Label, and enable `textFit = 'shrink'`. Complete wrapped content,
hard breaks and line spacing participate in fitting. If several rows fit at the
base size, the base size is retained. Automatic axes are unconstrained, so
width-only multiline captions normally wrap and grow taller without shrinking.
UI 3.6.0 reserves a symmetric outline inset in every nonempty dynamic
Label with a positive finite stroke, including normal layout. Automatic dimensions
contain the outline; fixed and maximum bounds wrap/fit inside it. Toggling fitting at unchanged drawing size
retains geometry and painting. Published 3.5.0 kept automatic dimensions nominal.
See [outline layout](docs/label-text-layout.md#outline-safe-layout-in-360).

```ts
const caption = new Label('Доказуемая честность');
caption.width = 120;
caption.height = 44;
caption.size = 30;
caption.wordWrap = true;
caption.lineSpacing = 2;
caption.stroke = 1;
caption.textFit = 'shrink';
caption.minFontSize = 14;
```

Label defaults to multiline, while explicit `multiline = false` displays one
unwrapped first line. Remove an old false flag or set it to true for text
intended to wrap. Files are not migrated automatically. Load fonts before
measurement; after late loading, call `label.invalidateSize()` to refresh
metrics even if the family name is unchanged.

See the [text layout and fitting contract](docs/label-text-layout.md). Fitting
metadata was introduced in document 0.9.0 and remains supported in 0.13.0.
CLI 3.6.0/3.6.1 and runtime 0.10.0 use document `^0.13.0`.
Runtime 0.10.0 also requires UI `^3.4.0` and Core `^2.4.0`. Programmatic UI depends
only on Core.

## Installation

UI 3.6.2 is published with the API reference and new authoring guides. Install
it below to read those bundled docs; the Core minimum is unchanged. Existing
applications and SDK development checkouts adopt their own installations/locks.

```bash
pnpm add @kurot/ui@^3.6.2 @kurot/core@^2.5.2
```

`@kurot/ui` declares `@kurot/core` as a peer dependency. Install both packages explicitly so the application controls the resolved core version.

UI 3.6.0 is available from npm. Its Core ^2.5.2 minimum supplies
the public glyph metrics and unified alignment used by outline-safe Label layout,
in addition to centered flips and the native text APIs from earlier releases.
Core installs its published bitmap-font dependency automatically. Update Core
installations older than 2.5.2 when adopting UI 3.6.0.
For legacy projects, refresh sheet manifests with string-valued `subkeys` in
Kurot Editor before launching the application on Core 2.x.
See the [resource migration guide](../ui-document/docs/resource-nine-slice.md).

Adopting 3.6.0 requires a UI installation/lock update and rebuild, plus an accepted
Core installation. Review outlined captions for the larger automatic dimensions
or earlier wraps. ui-runtime 0.10.0 accepts it through ^3.4.0; its development lock
may adopt it separately and its host must satisfy UI's Core peer. CLI/ui-document
need no release or XML migration. Editor 0.28.3 adopts exact registry UI 3.6.0 with a matching Bun lock and local
App build. The explicitly selected Tentax and MilfMaster templates adopt ^3.6.0
with matching pnpm locks and rebuilt outputs. The game example's ^3.1.0 range
already accepts 3.6.0; its lock adoption is optional and unchanged. Other
applications and SDK development locks retain their own installations.

## Project style colors

Default artwork and XML skins belong to CLI game templates and the application,
not the UI runtime package. The CLI 3.6.0 [rounded KUI skin kit](../cli/docs/default-ui-skins.md)
replaces the template's EUI atlas without changing the component APIs or requiring
a UI package release. The kit needs published Core ^2.5.0; CLI 3.6.0 is also published. Existing applications keep their own theme resources.

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
components assign numeric colors. Label presets are expanded by CLI/document
consumers before rendering; UI itself provides no automatic live theme switching. See the
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

The component supports native code and programmatic skins. Native KUI authoring
requires ui-document >= 0.12.0 and CLI >= 3.4.0; materialized previews require
ui-runtime >= 0.9.0. Editor adopts those contracts explicitly. Published UI 3.1.0
does not include BitmapLabel.
