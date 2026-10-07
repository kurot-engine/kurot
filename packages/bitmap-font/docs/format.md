# Bitmap font interchange and layout

## Native version 1

One full-color, unrotated atlas page. All values are finite numbers. The native
record is JSON-serializable; `parseBitmapFont` and `validateBitmapFont` create
independent, deeply frozen snapshots.

```json
{
  "version": 1,
  "file": "numbers.png",
  "lineHeight": 100,
  "baseline": 100,
  "spaceAdvance": 33,
  "glyphs": {
    "1": {
      "x": 125, "y": 303, "width": 36, "height": 98,
      "xOffset": 20, "yOffset": 0, "xAdvance": 76,
      "logicalWidth": 76, "logicalHeight": 100
    }
  },
  "kernings": {}
}
```

`file` is optional for direct texture injection, required for Core resource
loading, and resolved relative to the descriptor URL. JSON extension is arbitrary;
Egret `.fnt` files are detected by content.

Glyph keys are exactly one Unicode scalar, excluding hard line separators.
`x/y/width/height` describe the atlas region, in pixels, and are nonnegative.
`xOffset/yOffset` locate the cropped image relative to its pen position and may
be negative. `xAdvance` moves the pen and is nonnegative; zero is meaningful.
`logicalWidth/logicalHeight` preserve original, untrimmed design bounds and are
nonnegative. `lineHeight` is positive; baseline and spaceAdvance are nonnegative.
Baseline is available for editor guides; layout places all glyphs relative to the
line top using yOffset.

Kerning keys contain two decimal code points separated by a comma, for example
`"65,86": -2` for A followed by V. Both glyphs must exist. Amounts may be negative.

Native validation copies known fields. Keep editor-only source paths, selections,
undo history and layer settings in a separate editing-project document.
Serialization sorts glyph and kerning keys and ends with a newline.

## Import contracts

Egret JSON: `frames` maps characters to `x/y/w/h`, optional `offX/offY`,
`sourceW/sourceH`, and `xadvance`. Source dimensions default to the cropped
extent plus its offset. Advances default to sourceW. Global lineHeight defaults
to the largest sourceH; baseline defaults to lineHeight, and fallback space
advance to ceil(lineHeight * 0.33). Optional native-style kernings are supported.
Native export retains imported metrics and emits the versioned format above.

BMFont text follows the [official file tags](https://www.angelcode.com/products/bmfont/doc/file_format.html).
It requires common, page 0, and a correct chars count; kerning records and
supplementary Unicode ids are supported. The initial support is one unpacked
page, glyph `chnl=15` (or omitted). Multi-page, packed/channel-specific glyphs,
XML and binary BMFont are rejected rather than partially loaded.

Core additionally checks that every atlas region fits the loaded page. This
headless package cannot check image dimensions without caller-provided pixels.

## Layout contracts

Positions contain the pen coordinate before the glyph bearing; painters add
xOffset/yOffset. Font editors and Core use the same function.

- Iteration uses Unicode code points; source offsets remain UTF-16 indices.
- Missing glyphs contribute no geometry or advance. Missing U+0020 advances by
  spaceAdvance. Missing characters remain in each line's source text.
- Spacing applies between recognized glyphs/spaces, never before a line's first
  glyph. Kerning resets at each new line. Complex-script shaping is unsupported.
- Width wraps by code point, not word boundaries. A glyph wider than the supplied
  width still occupies its own line. Multiline=false disables automatic wrapping
  and renders only the first hard-separated line.
- CRLF is one hard break. CR, LF, U+2028 and U+2029 are hard breaks. Blank and
  trailing hard-separated lines keep their line boxes. An empty string has none.
- Width measures the maximum of advances and logical glyph extents. Height is
  the sum of fixed lineHeight boxes and inter-line spacing. Painted bounds also
  include cropped images outside the logical boxes, such as negative bearings.
- A supplied height admits only complete line boxes. Zero admits none. Omitted
  dimensions mean unconstrained; NaN/Infinity/negative constraints are invalid.
- Each line aligns independently within width. Vertical alignment uses the
  admitted block height. Alignment never changes glyph size. Core converts
  its public NaN dimension sentinel to an omitted layout constraint.

Metrics use font design units. Core's default textureScaleFactor=1 maps those
units directly to atlas pixels; font assets are not automatically rescaled.
