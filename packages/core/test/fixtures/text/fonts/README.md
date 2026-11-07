# Multilingual test fonts

These WOFF2 subsets are test fixtures, excluded from SDK publication. They
contain the strings and variants in `../languages.ts` plus basic ASCII. Runtime
font loading and application font policy are unchanged.

| Fixture | Source |
| --- | --- |
| barlow / barlow-bold | Barlow Condensed Regular / Bold |
| noto-sans | Noto Sans: Latin, Greek and Cyrillic |
| arabic / hebrew | Noto Sans Arabic / Noto Sans Hebrew |
| devanagari / bengali | Noto Sans Devanagari / Noto Sans Bengali |
| korean | Noto Sans KR |
| thai | Noto Sans Thai, weight 400 and width 75 |
| japanese / simplified / traditional | Glow Sans J / SC / TC Compressed Regular v0.93 |

Noto and Barlow sources are pinned to Google Fonts commit
`86aced91de05cd4f96a06838124cca45be337b2b`. Glow sources use the
[v0.93 release](https://github.com/welai/glow-sans/releases/tag/v0.93).
`sources.json` records the original font filename, SHA-256, source URL, selected
variation axes, subset characters and output size. Each font's original SIL OFL
license is included alongside it.

To regenerate, obtain the recorded source, verify its SHA-256, and call
`subset-font@2.9.0` with the recorded `characters`, `targetFormat: 'woff2'`,
`preserveNameIds: [0, 13, 14]`, and any recorded `variationAxes`. Retain default
OpenType layout features and glyph closure for contextual shaping. The fixture
generation tool is not a runtime or test dependency. Verify the subset's cmap
contains every recorded code point before replacing it; tests load each script
with its explicit fixture family rather than relying on system fallback.

Browser tests serve these local files through Playwright routes. They require
neither network access nor fonts installed on the host.
