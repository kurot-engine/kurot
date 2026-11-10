# RichLabel

Native rich text in an independent Component using Core TextField. UI 5 requires
Core ^3.0.0 and retains component typography. KUI authoring uses CLI 4.1
and ui-document 0.14; direct TypeScript use needs UI only.

```ts
import { RichLabel } from '@kurot/ui';

const label = new RichLabel();
label.size = 18;
label.stroke = 1;
label.textColor = 0xffffff;
label.textFlow = [
    { text: 'Attack increases by ' },
    { text: '10%', style: { textColor: 0x00ec00 } },
];
label.maxWidth = 240;
group.addChild(label);
```

## Content and ownership

RichLabel extends Component independently of Label. Content is assigned only
through `textFlow: ITextElement[]`. Plain `text`, Label `textStyle` presets,
`textFit` and `minFontSize` are not exposed. No baseStyle object, enable switch,
HTML/markdown parsing or nested style groups are introduced.

Seven component properties supply omitted run fields: `fontFamily`, `size`,
`textColor`, `stroke`, `strokeColor`, `bold` and `italic`. Each explicit run field
wins; undefined follows the component. Zero and false are explicit values.
An unstyled run does not inherit the preceding run. An explicit run size stays
fixed even when it initially equals the component size. Delete the run field
and reassign the flow to make it follow the component again.

The initial font family comes from the construction UIContext, otherwise Core;
size and fill color use Core's construction-time defaults (normally 30 and
white). Bold/italic start false, stroke is zero and strokeColor is black. Omitting
all component typography preserves the earlier rendering behavior.

Font families are CSS strings, not bitmap-font resource keys or Label presets.
Assignment does not load fonts. After asynchronous font readiness call
`invalidateSize()`, including when the family string has not changed. Size and
stroke accept finite nonnegative numbers; colors accept integer RGB values in
0..0xffffff. Invalid numeric values throw RangeError before changing the control;
invalid family/boolean types throw TypeError.

Assignments and reads copy text runs and their styles. Mutating an input or a
returned snapshot does not change the component; reassign an edited snapshot to
apply it. Typography does not rewrite or merge values into those snapshots.
Assigning [] clears content and retains component typography for later content.
Assigning textFlow dispatches PropertyEvent.PROPERTY_CHANGE for textFlow after
the copied content is installed, as before.

A changed typography property dispatches PropertyEvent.PROPERTY_CHANGE for its
own name after installing the value. Assigning the same value does nothing.
Changing typography does not dispatch a textFlow content-change event.

## Layout

All runs share continuous wrapping; style boundaries do not introduce a word
boundary or a new line. Ordinary Component geometry, constraints, visibility
and alpha remain available.

| Property | Default | Contract |
| --- | --- | --- |
| multiline | true | False displays the first hard-separated line without wrapping. |
| wordWrap | true | Unicode boundaries; false wraps between graphemes. |
| lineSpacing | 0 | Finite, nonnegative extra distance between rows. |
| textAlign | left | left, center or right. |
| verticalAlign | Host Core | top, middle or bottom. |
| textWidth / textHeight | Read-only | Complete content under the current width constraint, before height clipping. Empty content has zero metrics. |

Vertical alignment follows the host TextField default: middle with Core 3.
Explicit alignment works in either
line mode. The headless catalog records middle; omitted XML retains the native
host default.

Preferred width uses explicit width or maxWidth, otherwise unconstrained width.
The parent can therefore grow an automatic Group again after shorter content.
Parent-assigned width is used for the subsequent reflow and automatic height,
without replacing the preferred width with a historical wrapping limit.
`textWidth`/`textHeight` query the current parent-assigned width first, then
explicit width, then maxWidth, otherwise unconstrained width. Unchanged bounds
settle after reflow; text changes reflow even at the same assigned width.
Each row uses its largest run size; automatic height includes all wrapped rows
and inter-line spacing. Hard separators and
trailing blank lines follow the Core text contract. Empty content measures
0 × 0, while Component minimum dimensions can still enlarge layout bounds.
Fixed height clips drawing without discarding content metrics. Alignment positions
the continuous block within the assigned bounds.

Explicit/layout width and maxWidth affect wrapping and automatic height. Font,
size, bold and italic changes clear the component measurement cache. Color and
outline changes refresh drawing without changing the raw flow. By default,
outlines keep Core's render-only padding; RichLabel does not add Label's
outline-safe layout insets or shrinking behavior. The optional outline layout
below reserves space and makes outline changes invalidate measurement as well.
Consequently, top-aligned Label and RichLabel outer boxes do not imply aligned
text baselines when Label has an outline. This is a component layout difference,
not a change to Core line height. See [mixing the two controls](label-text-layout.md#mixing-label-and-richlabel)
for alignment choices and their limits. Run-level `stroke=0` still overrides a
component outline; in the default mode larger run outlines do not add layout padding. A parent
scrollRect or mask can clip this render-only ink at its authored boundary.
One native TextField renders through Canvas 2D and WebGL; measurement does not
temporarily resize it. Unchanged metrics are cached until content, size or width
invalidation. See [Core text layout](../../core/docs/text-layout.md) for wrapping,
baseline and independent measurement. Build UI and run `pnpm test:text-labels`
for minified Canvas/WebGL browser verification.

## Optional outline-safe content frame

This policy requires UI >= 5.3.0 and works with the supported Core ^3.2.1 peer.

`OutlineLayout` is `render-only | reserve-space`. The default remains
`render-only`, preserving existing geometry. To use Label's content-frame rules
for subsequently constructed RichLabels, configure UI startup before creating
views or loading their skins:

```ts
import { RichLabel } from '@kurot/ui';

RichLabel.defaultOutlineLayout = 'reserve-space';
const description = new RichLabel([{ text: 'Attack increases' }]);
description.size = 16;
description.stroke = 1;

// An individual view can retain its old content frame.
description.outlineLayout = 'render-only';
```

Each instance captures its construction policy. Changing the startup default
does not resize existing instances; assigning an instance policy remeasures it
and its parent and dispatches a property-change event. Invalid policy values
throw RangeError before changing the setting. This default belongs to the loaded
UI runtime, not an automatically isolated project. Applications sharing a runtime
can supply `UIContextOptions.richLabelOutlineLayout` inside `context.run()`;
an explicit context setting wins over the startup default. Binding an existing
subtree does not change captured policies. See [local contexts](ui-context.md).
These entry points are TypeScript APIs; KUI does not yet expose an
`outlineLayout` attribute.

In `reserve-space`, outer width/height, min/max and parent allocations retain
their usual meaning. Measurement, wrapping and painting use the inner frame.
For a uniform 16px line frame with stroke=1, automatic height is 22, the content
origin is (4,3), and an outer width of 180 leaves 172 for text, matching Label.
`textWidth`/`textHeight` report content metrics without the insets; they use the
inner wrapping width. A narrower inner width can add lines and increase height
by more than the outline allowance. Recheck fixed frames, list heights and
parent scroll ranges when enabling the mode.

Insets resolve each run's stroke, italic and authored size using local overrides
before component defaults; zero and false remain explicit. With any effective
positive outline, each axis takes the maximum per-run safety requirement:
vertical `ceil(stroke)+2`, horizontal `ceil(2*stroke)+2` plus `ceil(size/4)` for
italic runs. Unoutlined italic runs can contribute horizontal protection when
another run enables outline space. No positive outline means no added inset.
Empty runs contribute nothing. Single-line mode considers only source content
before the first hard separator; multiline considers all source runs, including
offscreen rows. The policy never inspects wrapped lines or current glyph ink.

The insets surround the complete block once; lineSpacing and mixed-size line
frames remain native. Splitting a run without changing its style does not alter
the result. Changes to effective outline/italic styles can change the whole
block's insets. Empty content keeps its zero measurement, subject to minimum
dimensions. A finite box smaller than its insets has zero available content
space; it does not become automatic. Parent scrollRect and masks retain exact
bounds and can still clip undersized content.

Label's shrink, minimum font size and overflow behavior are unchanged. RichLabel
still does not fit fonts. Equal styles, line policy and content constraints
produce equal frames; different fonts, mixed-size rows or a fitted Label need
not have the same baseline. EditableText and BitmapLabel are unaffected.

## KUI and states

```xml
<RichLabel id="description" width="210" size="18" stroke="1"
           textColor="#FFFFFF" size.disabled="16" bold.disabled="false">
    <textFlow>
        <Span text="Attack increases by " />
        <Span text="10%" textColor="#00EC00" />
    </textFlow>
</RichLabel>
```

The surrounding Skin declares disabled. Scalar state overrides replace and
restore only their own property, independently of textFlow changes. A local
Span override still wins in every state. Whole-flow overrides retain the existing
replacement semantics: [] clears and leaving the state restores the old flow.

Applications own listeners, timers and asynchronous work. Stage removal retains
the component's content and skin; dispose application activity through its owner.
