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

Measurement uses parent-assigned width first, then explicit width, then maxWidth,
otherwise unconstrained width. Each row uses its largest run size; automatic
height includes all wrapped rows and inter-line spacing. Hard separators and
trailing blank lines follow the Core text contract. Empty content measures
0 × 0, while Component minimum dimensions can still enlarge layout bounds.
Fixed height clips drawing without discarding content metrics. Alignment positions
the continuous block within the assigned bounds.

Explicit/layout width and maxWidth affect wrapping and automatic height. Font,
size, bold and italic changes clear the component measurement cache. Color and
outline changes refresh drawing without changing the raw flow. Outlines keep
Core's render-only padding; RichLabel does not add Label's outline-safe layout
insets or shrinking behavior.
One native TextField renders through Canvas 2D and WebGL; measurement does not
temporarily resize it. Unchanged metrics are cached until content, size or width
invalidation. See [Core text layout](../../core/docs/text-layout.md) for wrapping,
baseline and independent measurement. Build UI and run `pnpm test:text-labels`
for minified Canvas/WebGL browser verification.

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
