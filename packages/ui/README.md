# @kurot/ui

UI component framework for [@kurot/core](https://github.com/kurot-engine/kurot/tree/main/packages/core). Migrated from Egret EUI, rewritten in modern TypeScript with clean class inheritance — no namespace hacks, no prototype manipulation.

> **Stable (1.1.7).** Requires `@kurot/core@^1.0.12`. Targets ES2022 + evergreen browsers, same as core.

For the full list of changes in this release, see [CHANGELOG.md](./CHANGELOG.md).

## Installation

```bash
pnpm add @kurot/ui @kurot/core
```

`@kurot/ui` declares `@kurot/core` as a peer dependency. Install both packages explicitly so the application controls the resolved core version.

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

Property changes are batched and applied on the next animation frame:

```
invalidateProperties / invalidateSize / invalidateDisplayList
  → Validator queues the component
  → requestAnimationFrame tick
  → validateProperties  (shallow → deep,  commitProperties)
  → validateSize        (deep → shallow,  measure)
  → validateDisplayList (shallow → deep,  updateDisplayList)
```

### Skin system

```ts
import { Skin, State, SetProperty } from '@kurot/ui';

class MyButtonSkin extends Skin {
	constructor() {
		super();
		this.skinParts = ['labelDisplay'];
		this.states = [
			new State('up'),
			new State('down', [new SetProperty('bg', 'fillColor', 0x5a4bd1)]),
			new State('disabled', [new SetProperty('bg', 'fillColor', 0x636e72)]),
		];
		// build visual children...
	}
}

btn.skinName = MyButtonSkin;
```

## Components

### Basic Controls

| Component      | Description                                                                 |
| -------------- | --------------------------------------------------------------------------- |
| `Label`        | Text display. Wraps `TextField` in the UI lifecycle.                        |
| `Button`       | Tappable button with `up`/`down`/`disabled` states and `labelDisplay` part. |
| `CheckBox`     | Toggle button. Dispatches `Event.CHANGE` on selection change.               |
| `RadioButton`  | Mutually exclusive toggle. Use `groupName` to link buttons.                 |
| `ToggleButton` | Base for toggle-style buttons.                                              |
| `ToggleSwitch` | Binary on/off switch (visual variant of `ToggleButton`).                    |
| `ProgressBar`  | Value indicator. Inject `thumb` (a `Component`) as the fill part.           |
| `HSlider`      | Horizontal slider. Inject `thumb` and `track` skin parts.                   |
| `VSlider`      | Vertical slider. Inject `thumb` and `track` skin parts.                     |
| `Rect`         | Filled/stroked rectangle. Supports `fillColor`, `strokeColor`, `fillAlpha`. |
| `Image`        | Bitmap display. Supports URL string or `Texture`, `scale9Grid`, `fillMode`. |

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

### Data-Driven

| Component      | Description                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------- |
| `DataGroup`    | Renders a data collection using item renderers. Supports virtual layout for large datasets. |
| `List`         | `DataGroup` with tap-to-select. Dispatches `ItemTapEvent.ITEM_TAP`.                         |
| `TabBar`       | Horizontal tab strip driven by `dataProvider`. Dispatches `ItemTapEvent.ITEM_TAP`.          |
| `ComboBox`     | Drop-down selector. Tapping toggles a `list` skin part; dispatches `Event.CHANGE` on selection. |
| `ItemRenderer` | Base class for custom item renderers. Override `dataChanged()` to update visuals.           |

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
data.sortOn('name'); // sort by field
data.sort((a, b) => (a > b ? 1 : -1)); // custom sort
data.filterFunction(item => item !== 'Fig');
data.refresh(); // notify view after manual source changes
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
import { State, SetProperty, AddItems } from '@kurot/ui';

class MyButtonSkin extends Skin {
	states = [
		new State('up'),
		new State('down', [new SetProperty('bg', 'fillColor', 0x5a4bd1)]),
		new State('disabled', [
			new SetProperty('bg', 'fillColor', 0x636e72),
			new SetProperty('lbl', 'textColor', 0xb2bec3),
		]),
	];
}
```

## Events

| Event                               | Dispatched by                   | Description                                          |
| ----------------------------------- | ------------------------------- | ---------------------------------------------------- |
| `Event.CHANGE`                      | `List`, `TabBar`, `ComboBox`, `CheckBox`, `RadioButton`, `Range` | Selection or value changed (user interaction only for List/TabBar) |
| `ItemTapEvent.ITEM_TAP`             | `List`, `TabBar`                | Item tapped. Has `item`, `itemIndex`, `itemRenderer` |
| `CollectionEvent.COLLECTION_CHANGE` | `ArrayCollection`               | Data added, removed, replaced, reset                 |
| `UIEvent.CLOSING`                   | `Panel`                         | Close button tapped (cancelable)                     |
| `UIEvent.CREATION_COMPLETE`         | Any `Component`                 | First `createChildren` completed                     |

## UI Benchmark

The UI package includes three deterministic browser workloads: a 400-node
static skin, transform/alpha animation across 240 UI nodes, and a 10,000-record
virtual list. They measure frame/render time, draw calls, validation-phase
activity, and ItemRenderer creation/reuse.

Validation counters cover measured frames. Renderer creation/reuse and maximum
live-renderer counts cover the complete scenario, including warmup, so the
report can distinguish a stable pool from per-frame renderer churn.

The first complete Chromium run used 60 warmup frames and 300 measured frames:

| Workload | Setup | Frame P95 | Render P95 | Draw calls | UI lifecycle result |
| -------- | ----: | --------: | ---------: | ---------: | ------------------- |
| 400-node static image UI | 8.50 ms | 10.20 ms | 0.20 ms | 1 | No repeated validation after stabilization |
| 240-node transform/alpha animation | 3.90 ms | 10.00 ms | 0.30 ms | 1 | No measure or display-list validation |
| 10,000-record virtual list | 6.90 ms | 9.90 ms | 0.50 ms | 5 | 19 renderers created and at most 19 live |

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

|                | Egret EUI                   | @kurot/ui                          |
| -------------- | --------------------------- | ------------------------------------ |
| Namespace      | `eui.*` global              | ES Module named exports              |
| Component base | `namespace` + `mixin`       | Standard class inheritance           |
| Layout state   | Prototype-injected          | `UIState` delegation                 |
| EXML runtime   | Built-in parser             | Compile-time only (`@kurot/cli`)   |
| `thisObject`   | Required in event listeners | Not needed — use arrow functions     |
| Virtual layout | Default on                  | Opt-in via `useVirtualLayout = true` |
| i18n           | Built-in                    | Not supported                        |
