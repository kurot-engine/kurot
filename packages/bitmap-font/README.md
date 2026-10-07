# @kurot/bitmap-font

Version **0.1.0**. A headless TypeScript bitmap-font kernel
for games, font editors and build tools. No runtime dependencies, DOM, Canvas,
Core, UI, image decoding or filesystem access. ESM / ES2022.

```sh
pnpm add @kurot/bitmap-font@^0.1.0
```

```ts
import { parseBitmapFont, layoutBitmapText, serializeBitmapFont } from '@kurot/bitmap-font';

const font = parseBitmapFont(descriptorText);
const preview = layoutBitmapText(font, '1,234.56', { width: 540 });
const exportedJSON = serializeBitmapFont(font);
```

- `parseBitmapFont(unknown)`: native version-1 JSON, Egret frames JSON (including
  JSON `.fnt` files), or single-page, unpacked, full-color BMFont text.
- `validateBitmapFont(unknown)`: validates and copies native data to a deeply
  frozen snapshot. Editing inputs remain mutable and are never modified.
- `serializeBitmapFont(data)`: validated, deterministic native JSON.
- `layoutBitmapText(data, text, options?)`: glyph positions, UTF-16 indices,
  line metrics and bounds, with kerning, code-point wrapping and alignment.

Exported types: `BitmapFontData`, `BitmapGlyph`, `BitmapTextLayoutOptions`,
`BitmapTextLayout`, `BitmapTextLine`, `PositionedBitmapGlyph`.

See [format and layout contract](docs/format.md) and [verification](docs/verification.md). Importing this package does
not load images. Published Core 2.2.0 adds font resources and BitmapText
rendering using this package. Published UI 3.2.0 adds BitmapLabel and requires
Core ^2.2.0; published UI 3.1.0 does not contain the component.

A future editor keeps original glyph images, names and editing history in its
own project format. It uses this package for interchange and preview layout,
`@kurot/atlas` for packing pixels, and optionally Core for actual rendering.
Packing requires mapping each character to its resulting unrotated atlas region;
advances and bearings are font metrics and must survive pixel trimming.

```sh
pnpm install
pnpm build
pnpm test
```

Tests include the existing number-font descriptor; test resources are excluded
from the package. No font-editor application or CLI/KUI catalog adoption is
included. Published Core 2.2.0 and UI 3.2.0 resolve registry dependencies
without local pnpm overrides.
