# @kurot/ui

Native skinnable components, layout, collections, binding and view states for
Kurot games. Package version: **5.1.3**.
Requires Core **^3.2.1** for stable font-frame text layout and native BackdropBlur.

For game UI, read [standard authoring and directories](docs/ui-authoring.md) and
the [complete ScoreHUD component/Skin pair](docs/recipes/score-hud.md). Use
[API topics](docs/api/topics.md) and the [symbol index](docs/api/index.md) for
exact member contracts. Build-time KUI skins run through UI without ui-runtime.

## Background blur

UI 5.1's `Backdrop` wraps Core 3.2's dynamic background blur with normal
UI sizing. Create it in code before a modal's mask/popup. Four zero edge
constraints stretch it inside a UILayer/BasicLayout, following logical Stage
resize; regular containers use their own frame. Input passes through by default.
See [the API, ordering and lifecycle](docs/backdrop.md). No KUI component or
default Skin is introduced.

## Callback ownership

UI 5 removes receiver parameters from Animation, Watcher and Binding.bindHandler
and uses Core 3's callback-only ticker. Use stable arrow members or callbacks
bound once when they access instance state. See [callback ownership](docs/callbacks.md).

## Typed list data

UI 4.2 adds `List<T>`, inferred `ArrayCollection<T>`, nullable selection and typed
item-tap listeners. Defaults remain unknown; ItemRenderer retains `TSkin` first
and adds data second. Sparse/missing reads and empty selection include undefined.
Declared typed list fields in KUI hosts require CLI **>= 4.1.1 within 4.x**;
ordinary TypeScript use does not require CLI. See
[list data types](docs/list-data-types.md) for examples and null/undefined behavior.

## RichLabel component typography

RichLabel supports component fontFamily, size, textColor, stroke, strokeColor,
bold and italic. Omitted Span fields follow the component; explicit local values
remain fixed. Raw textFlow snapshots stay unchanged. Scalar KUI state overrides
restore independently. The feature uses UI 4.1, document 0.14 and CLI 4.1;
semantic materialization uses runtime 0.11. See the
[shared text contract](../ui-document/docs/text-components.md).

## Installation

```sh
pnpm add @kurot/ui@^5.1.3 @kurot/core@^3.2.2
```

Install Core explicitly so the application controls its shared engine instance.
UI inherits text defaults from the installed Core; set important alignment,
wrapping and fitting policies explicitly. Label reserves fixed outline insets
around stable font-frame rows; read [Label text layout](docs/label-text-layout.md)
when sizing text.

## Stable Label and RichLabel layout

Label automatic height and textFit use Core's full font-frame measurement.
Accents and descenders do not move unchanged baselines; tall font metrics may
increase automatic height or require a smaller fitted size in fixed bounds.
RichLabel uses the same dynamic row contract for mixed textFlow fonts/sizes,
without adopting Label's outline insets or fitting API. Set explicit top alignment
for progressively typed paragraphs that must retain their first-line origin.

Outlined Labels reserve `ceil(stroke) + 2` logical pixels above and below the
whole block. A 29px font frame with stroke=2 measures 37px. Horizontal protection
is separate and includes an authored-size italic guard; measurement, fitting and
painting share those insets. Use Core 3.2.2 for the accompanying render-only ink
and mixed-size scrolling corrections; the supported Core peer remains ^3.2.1.

## Text and styles

[RichLabel](docs/rich-label.md) owns rich textFlow data;
[BitmapLabel](docs/bitmap-label.md) uses registered bitmap-font resources.
[Label fitting](docs/label-text-layout.md) shrinks only the drawing size and
reports renderedSize/textFitOverflow without rewriting authored size.

Appearance, default artwork, fonts and translations belong to the project.
CLI resolves [project styles](../ui-document/docs/project-styles.md) into native
properties; UI does not read style.json or switch live themes automatically.

## Local UI contexts

UIContext scopes Skin names/default mappings, image adapters, bitmap-font
resources, UI default fonts and automatic RadioButton groups to one application.
Use `context.run()` for synchronous construction, or bind a root before stage
attachment. Later asynchronous callbacks that construct views need their own
run call. Missing local names never fall back to a global Theme or asset registry.

CLI 4 exports local Skin factories with
`ui.skinRegistration: 'module'`. Load them through the generated theme's skinsJs
path, then pass the factories and default mappings to UIContext. See the
[context contract](docs/ui-context.md) and [complete module loader](../cli/docs/module-skins.md).

Existing global applications keep their Theme/asset behavior. Dispose views
and their activity before the context, then release borrowed resources/fonts
through their owners.

## Stage-sized UI roots

UILayer adopts the stage's logical dimensions on attachment and follows later
size changes, including noScale viewports. It removes its Stage listener when
detached and resynchronizes on reattachment. See [UILayer](docs/api/UILayer-class.md).

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

Transformed layout applies parent allocations to the
transformed rectangle, including negative scale on either axis. A flipped Image
with 100% width/height fills its parent allocation, rather than reverting to the
texture dimensions. This behavior is shared by Group and Component subclasses.
Local minima/maxima still apply; infeasible transformed aspect ratios fit within
the allocation when the local minimum dimensions permit it.

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

Component binds named parts directly to host fields before `onSkinReady()`.
Old fields remain available throughout `onSkinRemoved()`, then owned references
are cleared. Declare the fields used by a view and access them directly:

```ts
import { TouchEvent } from '@kurot/core';
import { Component } from '@kurot/ui';
import type { Button, Label } from '@kurot/ui';

export class ConfirmPanel extends Component {
	declare btnConfirm: Button;
	declare lblMessage: Label;

	private readonly _onConfirm = (): void => {
		this.dispatchEventWith('confirmRequested');
	};

	public constructor() {
		super();
		this.skinName = 'game.ui.ConfirmPanelSkin';
	}

	protected override onSkinReady(): void {
		super.onSkinReady();
		this.btnConfirm.addEventListener(TouchEvent.TOUCH_TAP, this._onConfirm);
		this.lblMessage.text = 'Continue?';
	}

	protected override onSkinRemoved(): void {
		this.btnConfirm.removeEventListener(TouchEvent.TOUCH_TAP, this._onConfirm);
		super.onSkinRemoved();
	}
}
```

Presenters and view-specific helpers receive the concrete view and use
`panel.btnConfirm`. CLI 4 validates declarations and inherited parts against
associated KUI types before installing outputs. The existing `skinParts` lookup
remains a read-only enumeration interface for framework/tooling code.

Use `onSkinReady()` only for work that requires skin parts. Keep ordinary
one-time component initialization in `createChildren()`. Remove listeners and
other bindings created for a skin in `onSkinRemoved()` so replacing a skin
cannot retain stale objects.

Native slots preserve their setters and accepted types. Host methods, arbitrary
accessors and initialized business fields cannot be overwritten by Skin IDs.
See [field binding and ownership](docs/skin-part-fields.md) for declaration,
conflict, optional-part and lifecycle rules.

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

For a RadioButton group, selecting another radio or clearing
`group.selection = undefined` returns the previously selected radio to `up`
when enabled and no longer pressed. This also applies to skins that define
`upAndSelected` and `downAndSelected`.

## Events

| Event                               | Dispatched by                                                    | Description                                                        |
| ----------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `Event.CHANGE`                      | `List`, `TabBar`, `ComboBox`, `CheckBox`, `RadioButton`, `Range` | Selection or value changed (user interaction only for List/TabBar) |
| `ItemTapEvent.ITEM_TAP`             | `List`, `TabBar`                                                 | Item tapped. Has `item`, `itemIndex`, `itemRenderer`               |
| `CollectionEvent.COLLECTION_CHANGE` | `ArrayCollection`                                                | Data added, removed, replaced, reset                               |
| `UIEvent.CLOSING`                   | `Panel`                                                          | Close button tapped (cancelable)                                   |
| `UIEvent.CREATION_COMPLETE`         | Any `Component`                                                  | First `createChildren` completed                                   |

## UI benchmark

```sh
pnpm benchmark
pnpm benchmark:smoke
pnpm benchmark:compare
```

The page opens at `/benchmark/`. Automated runs write local results under
`examples/benchmark/results/`; use the same scenario and environment when
comparing results. These are UI self-comparisons rather than framework rankings.

## Native UI model

| Capability | Contract |
| --- | --- |
| Modules | Named ESM exports backed by the application's shared Core instance. |
| Layout | UIState delegation with properties, measurement and display-list validation. |
| Skins | KUI XML compiled by CLI into Skin factories. |
| Skin parts | Declared typed host fields, bound before `onSkinReady` and cleared after `onSkinRemoved`. |
| Callbacks | Stable arrow functions or functions bound once by their owner. |
| Virtual layout | Explicitly enabled with `useVirtualLayout = true`. |
| Translations | Project-managed text; Core owns Unicode wrapping and text rendering. |

## Bitmap labels

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
ui-runtime >= 0.9.0. Use the versions installed in the authoring and runtime project.
