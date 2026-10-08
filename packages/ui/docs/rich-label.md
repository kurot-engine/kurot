# RichLabel

Native API introduced in UI 3.3.0, requiring Core ^2.3.0. Core 2.3.1 is
published and installed from npm for this release's build and verification.

```ts
import { RichLabel } from '@kurot/ui';

const label = new RichLabel([
	{ text: 'Warning: ', style: { size: 20, bold: true, textColor: 0xff9900 } },
	{ text: 'read this before continuing.', style: { size: 20, italic: true } },
]);
label.maxWidth = 240;
group.addChild(label);
```

## Content and ownership

RichLabel extends Component independently, not Label. Its only content interface
is `textFlow: ITextElement[]`, using Core's text/style records. Whole-component
`text`, `fontFamily`, `size`, `bold`, `italic`, `textColor`, `textFit`, `minFontSize`
and `textStyle` are not exposed. Label presets do not apply to this component.

Runs can specify font family, size, bold, italic, text color, stroke color and
stroke width. Unspecified fields use the native TextField defaults captured at
construction. In particular, an unstyled run does not inherit the previous run.
All runs are laid out continuously; a style boundary does not introduce a word
boundary or a new line. No HTML or markdown parsing is performed.

The component copies runs and their styles on assignment and on reads. Mutating
an input array or a returned snapshot does not change the component. Reassign
an edited snapshot to apply it. Assigning [] clears content; assignment dispatches
PropertyEvent.PROPERTY_CHANGE for `textFlow` after the new content is installed.

## Layout

Ordinary Component geometry, layout constraints, visibility and alpha remain
available, together with these text-layout properties:

| Property               | Default   | Contract                                                                  |
| ---------------------- | --------- | ------------------------------------------------------------------------- |
| multiline              | true      | False shows the first hard-separated line without width wrapping.         |
| wordWrap               | true      | Unicode line-break opportunities; false wraps between graphemes.          |
| lineSpacing            | 0         | Finite, nonnegative distance between lines.                               |
| textAlign              | left      | left, center or right.                                                    |
| verticalAlign          | top       | top, middle or bottom.                                                    |
| textWidth / textHeight | Read-only | Complete content metrics under the current width, before height clipping. |

Measurement uses parent-assigned width first, then explicit width, then a
configured maxWidth, otherwise unconstrained width. Automatic height includes
every wrapped line and inter-line spacing. Each line uses the largest font size
of its runs, rather than imposing the TextField base size. Hard line separators
and trailing blank lines follow the Core text contract. Core 2.3.1 corrects the
base size of unstyled blank runs between styled runs; the API minimum stays 2.3.0. Empty content measures
0 × 0; Component minWidth/minHeight can still enlarge its layout bounds.

Fixed height clips drawing without discarding content. Alignment positions the
continuous text block within the assigned bounds. One native TextField renders
through Canvas 2D and WebGL; measurement never temporarily resizes that field.
Unchanged content metrics are cached until size/content invalidation or a width
change.

## Font readiness and integration

Load project fonts before measuring where possible. If fonts become ready later,
call `label.invalidateSize()` to clear both component and native text metrics,
then allow normal layout validation. RichLabel does not load font files or
install global font-loading listeners.

Published ui-document 0.12.0, CLI 3.4.0 and ui-runtime 0.9.0 provide RichLabel
authoring, KUI compilation and materialization. Earlier versions lack these
built-in registrations. Editor controls are owned by the separate application;
all consumers retain textFlow ownership and separation from Label presets.

See [Core text layout](../../core/docs/text-layout.md) for Unicode wrapping,
single-line behavior and independent measurement. Run `pnpm test:text-labels`
after building Core and UI for minified Canvas/WebGL browser verification.
