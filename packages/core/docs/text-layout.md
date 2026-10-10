# Text layout

`TextField.wordWrap = true` uses Unicode 17.0 UAX #14 line-break opportunities
from `@cto.af/linebreak`. Available width determines which opportunity is used.
Font family, size, bold and italic are measured through the same Canvas font
configuration used for rendering. Rich-text style boundaries do not create
additional wrap opportunities.

- Latin and Cyrillic text prefer word boundaries. CJK text observes opening
  and closing punctuation rules rather than treating dictionary words as units.
- Thai, Lao and Khmer add dictionary boundaries through the browser's
  `Intl.Segmenter`. The default Unicode rules remain independently testable.
- Since Core 2.2.1, optional word and emergency break opportunities are filtered
  through `Intl.Segmenter` grapheme boundaries. Emoji ZWJ sequences, flags,
  skin-tone modifiers, combining marks and conjuncts stay intact. A grapheme
  wider than the field overflows intact rather than being split.
- When an alphabetic word is wider than the entire line, emergency wrapping
  relaxes UAX #14's alphabetic rule LB28. Non-breaking spaces, narrow
  non-breaking spaces, word joiners and punctuation protection remain in force.
  Protected sequences can therefore exceed the field width.
- Ordinary spaces and tabs at a wrapped line's end are omitted from drawing
  and width measurement. They are consumed on that line, so they never become
  indentation on the next automatic line. Explicit indentation after a hard
  separator is retained. Other space characters keep their Unicode behavior.
- The source string is unchanged. Line `charNum` counts consumed UTF-16 code
  units, including unpainted spaces and both characters of CRLF. Painting,
  input caret and hit testing use these source offsets.
- In multiline mode, CRLF, CR, LF, VT, FF, NEL, line separator and paragraph
  separator force line breaks. A trailing hard separator retains a final empty line.

`wordWrap = false` wraps between grapheme clusters in multiline mode since
Core 2.2.1; earlier releases wrapped between code points. Since
Core 2.1.0, explicit `multiline = false` renders only the first
hard-separated line without width wrapping. Dynamic text defaults to multiline;
INPUT defaults to single-line until the flag is assigned. An unconstrained
multiline field measures its hard-separated lines without automatic wrapping.
Fixed height clips drawing rather than changing those measured lines.

Dictionary and grapheme segmentation follow the browser's `Intl` data. The
pinned Unicode 17.0 tables govern the line-break profile; they do not replace
the browser's grapheme implementation.

## Middle alignment independent of line mode (Core 2.5.1)

Core 2.5.1 is published, verified on npm on 2026-10-10, including the latest tag,
download and registry integrity. The previous 2.5.0 single-line-only visual
centering is described in the following section.

`multiline` controls hard breaks and width wrapping. Dynamic
`verticalAlign = "middle"` centers the complete laid-out glyph block in either
line mode. Identical single-row content, font and bounds produce identical
placement with `multiline = true` or `false`, including automatic height.
Multiple rows receive one shared translation; their relative alphabetic baselines
and line spacing are preserved. Rich runs and fallback glyphs participate in the
same block bounds. Each blank/whitespace-only row contributes its nominal height,
including leading and trailing blank rows. An entirely blank block uses those
nominal rows. Outlines remain render-only and do not affect alignment.

```ts
textField.multiline = true;
textField.verticalAlign = 'middle';
textField.text = 'First line\nSecond line';
```

The visible block is centered within the explicit height, or the nominal content
height when height is automatic. An overflowing dynamic block remains centered;
ordinary viewport clipping and scrolling still apply. Changing the outer glyph
extents can translate the complete block, without changing its row baselines or
distances. The cache reuses block bounds until font/content/wrapping/spacing
invalidation replaces the line layout.

INPUT continues to align its stable editing rows in either line mode. Caret,
selection, composition underline and pointer-to-character mapping use those rows,
so changing glyphs cannot move the editing frame. `top` and `bottom` retain their
nominal-row semantics. `textHeight`, `measureText()`, automatic dimensions, font
fitting and wrapping measurements retain their existing contracts.

Canvas, WebGL text rasterization, link hit tests and glyph/outline capture margins
share the block alignment. External masks/scrollRect and input viewports keep
their authored clip boundaries. No new public property, runtime dependency or
XML/resource format is introduced. Existing multiline dynamic middle-aligned
captions can move compared with 2.5.0; adopt Core 2.5.1 and rebuild
the application to receive the change. Existing SDK peers accept the patch.

Unit checks cover both line modes, complete paragraphs, mixed-size rich text,
blank rows, font/spacing invalidation, top/bottom, short viewports, links and
single/multiline input caret/selection. The minified browser checks compare
independent Canvas measurements and actual pixels in Canvas and WebGL 1/2 at
1×/2×, including multilingual text, wrapping, caches, outlines, caret, selection,
composition decoration and input character hits.

## Visual centering and stable baselines (Core 2.5.0)

This section records the published 2.5.0 behavior. Version 2.5.1 extends dynamic
middle alignment to multiple rows as described above; input and top/bottom retain
the contracts below.

Canvas and WebGL use the same alphabetic baseline and logical-pixel Canvas
`TextMetrics`. Each cached line records `baseline`, `inkAscent` and `inkDescent`;
rich runs share that baseline, even when their sizes or font families differ.
Visible bounds include fallback glyphs, accents and combining marks. No language
or operating-system offset table is used.

- Dynamic text with `multiline = false` and `verticalAlign = "middle"` centers
  the union of visible run ink in the field. Empty/whitespace-only lines use
  the nominal line box. Changing a button caption may change its baseline so
  its visible glyphs remain centered.
- Multiline text and INPUT retain font-based baselines. Font-frame bounds are
  measured with an empty string per font configuration, independently of the
  current caption and its fallback glyphs. Empty lines retain the same frame.
  Input caret/selection use the nominal row; composition underlines stay inside
  the viewport. Top/bottom alignment also uses nominal line boxes.
- `textHeight`, `measureText()`, wrapping, row spacing and layout bounds retain
  their nominal size contract. Dynamic glyph overhang is added only to render
  captures, together with outlines; INPUT and external clips remain exact.
- Measurements are reused with the TextField line cache. After loading/replacing
  a font, call `invalidateTextMetrics()` through the existing readiness path.
  Fonts and browser rasterization can differ across systems; centering follows
  the actual selected glyphs rather than promising identical pixels.

See the [Canvas TextMetrics contract](https://html.spec.whatwg.org/multipage/canvas.html#textmetrics).
The correction is included in published Core 2.5.0; it is not in
published Core 2.4.0. There is no new alignment
property, runtime dependency or XML format. Default KUI single-line control
labels use the existing flags with symmetric padding. Adopt Core 2.5.0 and rebuild to receive this behavior; SDK peers need no
incidental change.

`test/TextVerticalLayout.test.ts` covers ink centering, mixed sizes, stable input
and paragraph baselines, link hits, blank rows, overhang and font invalidation.
The minified `text-alignment.spec.ts` compares 18 multilingual strings in regular
and bold faces against an independent Canvas reference in Canvas/WebGL 1/2 at
1×/2×, including rich runs, outlines, nested caches and tight Thai/Hindi rows.
The continuous-frame checks also cover restoring the root WebGL target after
its initial offscreen allocation.

## Independent measurement (Core 2.3.0)

`textField.measureText(width = NaN)` measures complete content under a separate
width constraint. NaN means unconstrained; zero returns no lines in multiline
mode; negative or infinite values throw RangeError. Single-line mode ignores
width wrapping as it does during rendering.

The result excludes height clipping and scrolling. Measurement does not replace
rendered line caches or change width, height, content or dirty flags. It uses the
same run styles and line spacing as rendering. For dynamic rich text, line height
is the largest run size on that line; blank and trailing hard-separated lines
retain the relevant run size. Input fields keep the base size contract. Core 2.3.1 corrects unstyled blank
runs between styled runs: they use the base size rather than the later run's size.

Assigning `text`, including the same string represented by a previous `textFlow`,
returns the field to plain-text styling. `measureText` does not load fonts or
cache a separate measurement; UI components may cache results until invalidated.

## Text outlines (Core 2.3.2)

Dynamic TextFields have a render-only margin for their effective stroke widths,
including run-level overrides. Canvas clipping, WebGL text rasterization,
display-list caches, filter captures and object-mask buffers retain this ink.
The margin covers stroke antialiasing and glyph overhang; it is not part of
`width`, `height`, `textWidth`, `textHeight`, `measureText()` or hit-test bounds.
Wrapping and horizontal/vertical alignment use the original layout dimensions.

Explicit dimensions still constrain layout and select visible lines. Partially
visible lines clip against the expanded ink area; fully hidden lines are not
painted, including lines immediately before or after a scrolled viewport.
Input fields keep their exact viewport for text, selection and caret drawing.
External `scrollRect` and masks retain their authored boundaries and can clip
outlines intentionally. Zero-size fields remain empty.

`test/TextStroke.test.ts` covers render margins, run overrides, measurements,
scrolling, input viewports, zero dimensions and resolution-limited GPU caches.
The minified browser suite in
`examples/visual-regression/tests/text-stroke.spec.ts` compares actual text pixels
with an unclipped Canvas reference in Canvas 2D, WebGL 1 and WebGL 2 at 1x/2x
resolution. Canvas CPU filter and object-mask captures retain their existing
1x rasterization; their pixel comparison runs at 1x. This fix is published in
Core 2.3.2 and is not included in Core 2.3.1. No layout/API migration or dependent
SDK bump is required. Update
the installed Core and rebuild the application to adopt the correction.

## Font readiness

Load fonts before constructing or measuring text where possible. After a font
becomes ready late, call `textField.invalidateTextMetrics()`; reassigning an
unchanged family name does not invalidate cached line measurements. This method
clears text layout and marks the text for rendering with the newly available
font. UI Labels additionally need layout invalidation through their documented
`invalidateSize()` contract. Core does not install a global font-loading listener.

## Migration from 2.0.1

Dynamic text previously wrapped even when `multiline` was explicitly false.
Remove that flag or set it to true where multiple lines are intended. The source
string is retained, including later hard-separated lines hidden in single-line
mode. Existing files are not rewritten automatically.

`WordWrap.tokenize()` remains a public word-segmentation utility; it is not the
TextField line-break algorithm. `splitGraphemes()` returns complete grapheme
clusters. These utilities and TextField share cached word/grapheme segmenters.
Layout computes grapheme end offsets once per constrained paragraph and reuses
them for ordinary and emergency wrapping. Text and segmentation results are
not cached globally.

## Validation

`test/LineBreaks.test.ts` verifies all 19,338 official Unicode 17.0 line-break
cases against the untailored profile. The compressed fixture includes its
source URL, SHA-256 and Unicode license. Dictionary and emergency tailoring,
multilingual width fitting, rich text, input offsets and rendering are tested
separately in `test/TextWrapping.test.ts`.
`test/TextGraphemes.test.ts` covers complete-character wrapping, oversized
clusters, rich-text boundaries, hard separators and UTF-16 input offsets.
`test/LineBreaks.test.ts` also builds and executes a minified browser bundle
with `keepNames: false` to verify dictionary, alphabetic, grapheme and
non-breaking protection. The test environment provides browser APIs without
Node's `Buffer` global.

The 2.2.1 release check installs the packed Core with published UI 3.2.0 and
DragonBones 0.1.0, checks their declarations together, and renders a complete
minified browser bundle with `keepNames: false` in Canvas 2D, WebGL 1 and
WebGL 2. It verifies real-font grapheme layout, dictionary/emergency wrapping,
BitmapLabel glyphs and an animated native DragonBones mesh.

The dependency bundles its Unicode property tables and uses no network or Node
runtime APIs. Both WebGL text rasterization and Canvas rendering share this
layout. Core 2.1.0 also adds explicit single-line and font-invalidation
regressions. No resource-manifest or CLI XML-format change is involved.

## Core 2.2.1 adoption snapshot

This section records the dependency audit for 2.2.1, before the later native
RichLabel releases and Editor 0.22.0. For current peer requirements and 2.3.2
adoption, see the [independent release policy](../../../docs/dependency-policy.md).

Published UI 3.2.0 requires Core `^2.2.0` for BitmapLabel. Older UI 3.1.0 and
ui-runtime 0.8.2 declare Core `^2.1.0`; game 2.0.0 declares `^2.0.0`.
Existing example lockfiles still resolve Core 2.1.1 and UI 3.1.0; accepting a
version in a dependency range does not update an installed package.
DragonBones 0.1.0 declares Core `^2.1.1` and develops against published Core
2.2.0. Its animation adapter does not depend on TextField wrapping changes.
CLI templates use `latest`.
Label font shrinking calls `invalidateTextMetrics()` and requires Core 2.1.0
or later. Core 2.2.1 preserves that TextField contract and remains accepted by
these existing peer ranges. Bitmap-font rendering is separate from TextField;
see [bitmap fonts](bitmap-fonts.md). The new UI BitmapLabel requires Core 2.2.0
and published UI 3.2.0; published UI 3.1.0 does not contain it.

Core 2.2.1 is published. The 2026-10-08 dependency audit checked declarations,
lockfiles and installed package versions. Older versions inside an accepted
range are optional adoption for projects/development, not SDK release blockers.
See the [independent release policy](../../../docs/dependency-policy.md).

| Consumer                                | Audited Core declaration                                                  | Locked or pinned Core at audit                               | Adoption or migration                                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| UI development                          | `^2.2.0`                                                                  | 2.2.0                                                        | Optionally refresh the development lockfile.                                                                               |
| DragonBones development                 | `^2.2.0`; peer `^2.1.1`                                                   | 2.2.0                                                        | Optionally refresh the development lockfile. The peer already accepts 2.2.1.                                               |
| Game / ui-runtime development           | `^2.1.1`                                                                  | 2.1.1                                                        | Optionally refresh the development lockfiles. Their peers already accept 2.2.1.                                            |
| Engine examples / copied Reskin project | `^2.1.1`                                                                  | 2.1.1                                                        | Refresh application lockfiles when adopting the fix.                                                                       |
| Templates/tentax                        | `^2.2.1`                                                                  | 2.2.1                                                        | Adopted with UI 3.2.0 and Spine 4.0 adapter 0.2.1; strict development/release builds and all 170 application tests passed. |
| Editor                                  | `2.1.1`                                                                   | 2.1.1 in bun.lock and the installation                       | Update the exact dependency, lockfile and installation; rebuild to deliver the fix.                                        |
| Reskin application                      | `^2.1.1`                                                                  | 2.1.1 in bun.lock and the installation                       | Refresh the Bun lockfile and installation when adopting the fix; validate the Spine 4.0 adapter.                           |
| milf-master template                    | `^2.1.1`                                                                  | No lockfile or installed Core                                | New installs accept 2.2.1; use `^2.2.1` to require the corrected baseline.                                                 |
| Separate Spine 4.0–4.3 adapters         | Published 0.2.1 / 0.3.1 peers `^1.0.16 \|\| ^2.0.0`; development `^2.2.1` | Development 2.2.1; earlier 0.2.0 / 0.3.0 have Core 1.x peers | Refresh consumer installations/locks to adopt the published adapter patches.                                               |

UI, Game, ui-runtime and DragonBones need no new release solely to receive this
Core patch: their published peers already accept 2.2.1. Development installs
may be refreshed independently. Raising their development baseline to 2.2.1 is separate
from raising the minimum supported peer version.

Earlier Spine 4.0–4.2 adapter 0.2.0 and 4.3 adapter 0.3.0 peers exclude Core
2.x. Published 0.2.1 / 0.3.1 have peers `^1.0.16 || ^2.0.0`, validated using
packed adapters on Core 1.0.16, 2.0.0 and 2.2.1. Publication was verified on
npm on 2026-10-08. Reskin and the copied Tentax project accept the Spine 4.0
patch through their existing `^0.2.0` range; refresh their installed adapter and
rebuild. Templates/tentax has adopted published adapter 0.2.1 and Core 2.2.1,
with UI/Game/Spine resolving the same Core instance. The Core patch itself does
not update these consumers.

CLI's empty/game templates use `latest`, which resolved to Core 2.2.1 at this audit.
CLI itself, bitmap-font, atlas and ui-document have no Core dependency to update.
The Kurot-Dev website is static and does not install the engine runtime.

## Updating from Core 2.2.0 to 2.2.1

The 2.2.0 wrapper customizes rules by function name. Minifiers that rename
functions can silently disable alphabetic overflow tailoring and cause SA-script
dictionary wrapping to throw `Rule not found: "LB28"`. Core 2.2.1 customizes
the pinned dependency's rules by imported function identity, so this text path
no longer requires preserved function names. Kurot CLI's existing
`keepNames: true` setting remains useful for other name-based consumer APIs;
this patch does not change the CLI build contract.

Passing the official default corpus does not cover every real-text sequence.
The dependency exposes internal break opportunities for some composed emoji,
including family ZWJ sequences. Core 2.2.1 filters optional layout opportunities
through grapheme boundaries and uses those boundaries for character wrapping.
The untailored default Unicode profile remains unchanged. This affects
TextField layout without changing DragonBones playback or the separate
bitmap-font layout contract. No asset or project migration is required; update
the installed package and lockfile. Core 2.2.1 is published to npm.

References: [UAX #14 revision 55](https://www.unicode.org/reports/tr14/tr14-55.html),
[official corpus](https://www.unicode.org/Public/17.0.0/ucd/auxiliary/LineBreakTest.txt),
[@cto.af/linebreak](https://github.com/cto-af/linebreak).
