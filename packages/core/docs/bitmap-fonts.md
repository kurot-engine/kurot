# Bitmap fonts

Available in Core 2.2.0 with the published `@kurot/bitmap-font ^0.1.0` dependency.
Package installs and local builds resolve the font kernel from npm. Installed
Core 2.1.1 does not include FontAnalyzer or BitmapText rendering; update Core and
the lockfile to receive them. Source versions alone do not confirm publication.

A bitmap font is a descriptor plus a full image page. Core owns image loading and
rendering; @kurot/bitmap-font owns validation, parsing, serialization and layout.
See [the shared format](../../bitmap-font/docs/format.md).

```ts
import { BitmapFont, BitmapText, resource } from '@kurot/core';

resource.addResource({
  name: 'number_font_fnt',
  type: 'font',
  url: 'resource/assets/font/number_font.fnt',
});
const font = await resource.load<BitmapFont>('number_font_fnt');
const text = new BitmapText();
text.font = font;
text.multiline = false;
text.text = '1,234.56';
stage.addChild(text);
```

`font` is a built-in ResourceType and FontAnalyzer. The descriptor's file is
resolved relative to the descriptor URL, including URLs with queries. Loading
resolves only after both descriptor and page are ready. Concurrent requests for
one font share the pending load. A separately configured PNG resource has
independent ownership; loading it is not required for the font.

Supported descriptors: native version-1 JSON, Egret frames JSON, single-page
unpacked BMFont text. XML/binary/multi-page/channel-packed fonts are unsupported.
Glyph coordinates must fit a complete, unrotated page texture.

## Direct texture injection and ownership

```ts
const font = new BitmapFont(pageTexture, descriptor, { ownsTexture: false });
```

Direct construction owns the page by default, retaining the SpriteSheet lifecycle
contract. Set ownsTexture=false for a page owned by a project asset cache. Font
dispose is idempotent, invalidates subsequent getTexture calls, and disposes only
owned page data. BitmapText borrows the font; removing text never disposes it.
FontAnalyzer owns its internal page cache and frees it on resource.destroy(name).
Do not destroy a font while text using it remains displayed.

Parsed `font.data` is a deeply frozen snapshot. Changes require a new font; render
layout caches assume data does not mutate. Glyph subtextures are borrowed views.

## Text metrics and rendering

BitmapText has text/font, lineSpacing/letterSpacing, smoothing, multiline,
left/center/right textAlign and top/middle/bottom verticalAlign. The default is
multiline=true. Font metrics, fallback spaces, kerning, wrapping and bounds come
from layoutBitmapText. `getLayout()` and `getGlyphs()` expose borrowed readonly
layout data, while textWidth/textHeight report admitted line metrics.
measureText(width?, height?) measures independently without mutating rendered
constraints or invalidating its cached layout. UI uses it for measurement.

Width and height are constraints, not scales; set scaleX/scaleY to resize font
art. NaN removes a dimension constraint. Height admits complete line boxes;
multiline=false draws the first hard-separated line without width wrapping.
Explicit zero height draws nothing. Default textureScaleFactor=1 is required for
font assets in this initial implementation.
The Core 2.5.0 texture-density extension keeps literal font metrics separate:
BitmapFont page textures require resolution=1. See [texture density](texture-density.md).

WebGL's BitmapTextPipe submits cropped glyph quads to ordinary texture batching,
with current transforms, alpha, tint, blend, clipping and filters. Canvas uses the
same layout and glyph geometry, including tint; cacheAsTexture and RenderTexture
use that Canvas path. Both honor font offsets without allocating child nodes.
Changing text/font/metrics invalidates layout and rendering, including an
existing WebGL instruction without a scene rebuild.

Core 2.2.0 fixes BitmapText's previous setter-only width/height accessors.
BitmapText.EMPTY_FACTOR is retained as a deprecated field; per-font spaceAdvance
now controls fallback spaces. Line-height, trailing-advance and complete-line
clipping follow the shared
format contract rather than the old unrendered class's approximate measurements.

UI 3.2.0 introduced native BitmapLabel; UI 3.1.0 does not include it. Current
UI 3.4.0 retains it and requires Core ^2.4.0. Published document 0.13.0, CLI
3.5.0 and runtime 0.10.0 support font authoring, compilation and materialization;
existing installed compilers do not gain a new tag automatically. See
[BitmapLabel](../../ui/docs/bitmap-label.md) for the feature's introduction versions.
