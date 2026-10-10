# BitmapLabel

Available in UI 3.2.0 with `@kurot/core ^2.2.0`. Core resolves its published
@kurot/bitmap-font dependency from npm. UI 3.2.0 is published;
published UI 3.1.0 does not contain this component. Core 2.1.1 does not contain
its required BitmapText rendering.

UI 3.3.0 retains this API and raises the package's Core minimum to ^2.3.0 for
RichLabel. During automatic sizing it also uses maxWidth when neither a parent
width nor an explicit width is present, so wrapped height matches rendering.
Changing an authored width also invalidates automatic height after layout.
UI 3.3.0 builds and tests against published Core 2.3.1 without local overrides.

Current UI 3.4.0 retains BitmapLabel and requires Core ^2.4.0 for centered flips.
Its development installation and lock use published Core 2.4.0.

```ts
import { BitmapLabel } from '@kurot/ui';

const label = new BitmapLabel('1,234.56');
label.font = 'number_font_fnt';
label.multiline = false;
label.height = 100;
group.addChild(label);
```

`font` accepts a BitmapFont, a configured resource name, or undefined to clear.
Names resolve through the Core resource singleton. Preloaded names resolve
synchronously during commitProperties; unloaded names start resource.load.
Successful name resolution dispatches Event.COMPLETE; failed or incorrectly
typed resources dispatch IOErrorEvent.IO_ERROR with source/error data.
Superseded asynchronous requests cannot overwrite a newer font assignment,
including A-to-B-to-A changes. The resource cache or caller retains ownership.

Text assignments dispatch PropertyEvent.PROPERTY_CHANGE for binding. The
component participates in normal layout, measurement and invalidation and owns
one BitmapText child. Parent width constraints affect wrapping; measurements do
not leave temporary width/height constraints on that child. textWidth/textHeight
report content under the width constraint before height clipping.

Properties: text, font, textAlign, verticalAlign, letterSpacing, lineSpacing,
multiline and smoothing, plus ordinary Component properties. Tint is the ordinary
DisplayObject tint. Alignments position glyphs without scaling them. Set scaleX
and scaleY for decorative number sizing. Default multiline=true; explicit false
keeps the first hard-separated line unwrapped.

Vertical alignment inherits BitmapText's default: middle with published Core 2.5.3,
top with published 2.5.2 and earlier. Explicit top/bottom remain effective in either
line mode. Bitmap-font metrics and glyph offsets are unchanged. UI 3.4.0 accepts
the patch without another UI release; applications update their Core installation/
lock and rebuild. Published document 0.13.1 supplies the matching
catalog default.

Authoring support was introduced in document 0.12.0, CLI 3.4.0 and runtime 0.9.0.
Current document 0.13.0, CLI 3.5.0 and runtime 0.10.0 retain BitmapLabel
authoring, KUI compilation and materialization. Earlier compilers do not accept
this built-in XML tag; update applications explicitly when adopting it. Editor
controls are owned by the separate application.
