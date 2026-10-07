# BitmapLabel

Available in UI 3.2.0 with `@kurot/core ^2.2.0`. Core resolves its published
@kurot/bitmap-font dependency from npm. UI 3.2.0 is published;
published UI 3.1.0 does not contain this component. Core 2.1.1 does not contain
its required BitmapText rendering.

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

This initial change exposes a native UI component and supports programmatic
skins. The ui-document built-in catalog, CLI KUI tag registry, Editor and
ui-runtime materializers do not yet adopt BitmapLabel. Those require coordinated
consumer releases; do not assume an installed compiler accepts the XML tag.
