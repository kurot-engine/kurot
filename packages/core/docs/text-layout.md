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
- CRLF, CR, LF, VT, FF, NEL, line separator and paragraph separator force line
  breaks. A trailing hard separator retains a final empty line.

`wordWrap = false` retains character-based wrapping. Single-line INPUT fields
do not wrap to available width; multiline INPUT and dynamic text do. An
unconstrained field measures its hard-separated lines without automatic wrapping.

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
layout. Core 2.0.1 is sufficient for existing UI 3.x / ui-runtime 0.7 consumers;
no CLI XML-format change is involved.

## Package dependencies

UI 3.0.0, game 2.0.0 and ui-runtime 0.7.0 already declare Core `^2.0.0` in their
peer/development ranges, which include Core 2.0.1. Repository examples require
Core `^2.0.1`. CLI templates use `latest`. This text-layout fix does not require
a version bump in the dependant libraries.

References: [UAX #14 revision 55](https://www.unicode.org/reports/tr14/tr14-55.html),
[official corpus](https://www.unicode.org/Public/17.0.0/ucd/auxiliary/LineBreakTest.txt),
[@cto.af/linebreak](https://github.com/cto-af/linebreak).
