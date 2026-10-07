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

`wordWrap = false` retains character-based wrapping in multiline mode. Since
Core 2.1.0, explicit `multiline = false` renders only the first
hard-separated line without width wrapping. Dynamic text defaults to multiline;
INPUT defaults to single-line until the flag is assigned. An unconstrained
multiline field measures its hard-separated lines without automatic wrapping.
Fixed height clips drawing rather than changing those measured lines.

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
TextField line-break algorithm. `splitGraphemes()` is likewise independent.

## Validation

`test/LineBreaks.test.ts` verifies all 19,338 official Unicode 17.0 line-break
cases against the untailored profile. The compressed fixture includes its
source URL, SHA-256 and Unicode license. Dictionary and emergency tailoring,
multilingual width fitting, rich text, input offsets and rendering are tested
separately in `test/TextWrapping.test.ts`.

The dependency bundles its Unicode property tables and uses no network or Node
runtime APIs. Both WebGL text rasterization and Canvas rendering share this
layout. Core 2.1.0 also adds explicit single-line and font-invalidation
regressions. No resource-manifest or CLI XML-format change is involved.

## Package dependencies

Published UI 3.2.0 requires Core `^2.2.0` for BitmapLabel. Older UI 3.1.0 and
ui-runtime 0.8.2 declare Core `^2.1.0`; game 2.0.0 declares `^2.0.0`.
Existing example lockfiles still resolve Core 2.1.1 and UI 3.1.0; accepting a
version in a dependency range does not update an installed package.
DragonBones 0.1.0 declares Core `^2.1.1` and develops against published Core
2.2.0. Its animation adapter does not depend on TextField wrapping changes.
CLI templates use `latest`.
Label font shrinking calls `invalidateTextMetrics()` and requires Core 2.1.0
or later. Core 2.2.0 preserves that TextField contract and remains accepted by
these existing peer ranges. Bitmap-font rendering is separate from TextField;
see [bitmap fonts](bitmap-fonts.md). The new UI BitmapLabel requires Core 2.2.0
and published UI 3.2.0; published UI 3.1.0 does not contain it.

## Known issues in Core 2.2.0

The current wrapper customizes rules by function name. Minifiers that rename
functions can silently disable alphabetic overflow tailoring and cause SA-script
dictionary wrapping to throw `Rule not found: "LB28"`. Preserve function names
when bundling this release, for example with esbuild's `keepNames: true`.
Kurot CLI 3.3.1 already enables this setting for release bundles.

Passing the official default corpus does not cover every real-text sequence.
The current dependency exposes internal break opportunities for some composed
emoji, including the family ZWJ sequence, and the wrapper does not filter them
against grapheme boundaries. Character wrapping also works by code point rather
than grapheme cluster. A narrow field can therefore split a composed character.
These are TextField issues; they do not change DragonBones animation playback
or the separate bitmap-font layout contract.

References: [UAX #14 revision 55](https://www.unicode.org/reports/tr14/tr14-55.html),
[official corpus](https://www.unicode.org/Public/17.0.0/ucd/auxiliary/LineBreakTest.txt),
[@cto.af/linebreak](https://github.com/cto-af/linebreak).
