# BitmapLabel

Native bitmap-font text with UI layout and configured resource loading.
Use the installed UI/Core peer pair; public declarations define the available API.

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

Vertical alignment inherits BitmapText's default: middle with Core >= 2.5.3,
top with the accepted Core 2.5.2 baseline. Explicit alignment remains effective
in either line mode. The headless catalog records middle; omitted XML values
still use the native host default.

Authoring requires document >= 0.12.0, CLI >= 3.4.0 or runtime >= 0.9.0,
plus their declared peers.
Editor controls belong to the consuming application.
