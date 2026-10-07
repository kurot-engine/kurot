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

## Package dependencies

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

Current consumers still need an installed-version update after 2.2.1 is published:

| Consumer | Current Core declaration | Locked or pinned Core | Required update |
| --- | --- | --- | --- |
| UI development | `^2.2.0` | 2.2.0 | Refresh the lockfile. |
| DragonBones development | `2.2.0`; peer `^2.1.1` | 2.2.0 | Update the development pin and lockfile. The peer already accepts 2.2.1. |
| Game / ui-runtime development | `^2.1.1` | 2.1.1 | Refresh the lockfiles. Their peers already accept 2.2.1. |
| Engine examples / tentax / copied Reskin project | `^2.1.1` | 2.1.1 | Refresh application lockfiles. |
| Editor | `2.1.1` | Exact pin 2.1.1 | Update the dependency and rebuild to deliver the fix. |
| Reskin application / milf-master template | `^2.1.1` | No pnpm lockfile | Update the installation; the declared range accepts 2.2.1. |

These consumer packages and applications are not changed by the Core patch.

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
the installed package and lockfile after publication. Source 2.2.1 is prepared
for publication; Core 2.2.0 is the published release.

References: [UAX #14 revision 55](https://www.unicode.org/reports/tr14/tr14-55.html),
[official corpus](https://www.unicode.org/Public/17.0.0/ucd/auxiliary/LineBreakTest.txt),
[@cto.af/linebreak](https://github.com/cto-af/linebreak).
