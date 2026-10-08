# BitmapLabel and RichLabel authoring

ui-document 0.12.0 adds two independent built-in types. It remains headless and
keeps semantic format version 2. The native components are published in UI
3.3.0, with Core ^2.3.0 required by UI; Core 2.3.1 contains the blank-rich-run
measurement correction. No opened project is migrated or given new fields.

## Choose the component

| Component     | Content                                | Appearance                                                          | Layout                                             |
| ------------- | -------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------- |
| `Label`       | Plain `text`                           | Local properties and optional `style.json.labels` preset            | Wrapping, alignment, single-line shrinking         |
| `BitmapLabel` | Plain `text` and typed `font` resource | Glyph metrics and colors from the bitmap font; display scaling/tint | Wrapping, spacing and alignment                    |
| `RichLabel`   | Ordered `textFlow` runs                | Literal per-run font, size, colors, outline, bold and italic        | Continuous Unicode wrapping, spacing and alignment |

BitmapLabel and RichLabel extend Component directly. Neither accepts Label's
`textStyle`, `textFit`, `minFontSize`, `size`, `fontFamily` or `textColor` as
whole-component authoring properties. RichLabel also has no plain `text`.
Ordinary geometry, constraints, visibility and Component properties remain
available. Content metrics are runtime observations, never authored properties.

## Bitmap font resources

```xml
<BitmapLabel id="score" text="100.80" font="score_font"
             width="200" multiline="false" textAlign="right" />
```

`font` is a configured resource key, not a CSS family or descriptor path. The
semantic value is `{ kind: 'resource', resourceType: 'font', key: 'score_font' }`.
Project validation checks its registration. Font resources load a supported
bitmap-font descriptor and its texture page through Core's resource manager.
The resource loader owns the font; destroying a component must not destroy it.
The catalog does not require a font at authoring time; an omitted font displays
no glyphs until assigned. It never invents a vector-font fallback.

`text` and state text are literal strings. Typed resource keys retain their
identity even when they look like a scalar (`true`, `false`, `100.80`).
`multiline` and `smoothing` default to true, `letterSpacing` and `lineSpacing`
to zero. Negative letter spacing is allowed; line spacing must be nonnegative.
Horizontal alignment is left/center/right, vertical alignment top/middle/bottom.
Defaults stay omitted in authored XML. Scaling uses normal display transforms;
there is no independent font-size or automatic text-fit setting.

## Literal rich text

```xml
<RichLabel id="notice" width="240">
    <textFlow>
        <Span text="Balance: " size="20" />
        <Span text="100.80" bold="true" size="20" textColor="#FFCC00" />
        <Span text="&#10;Available now" italic="true" size="16" />
    </textFlow>
</RichLabel>
```

The semantic property contains plain data:

```ts
import type { UITextFlow } from '@kurot/ui-document';

const textFlow: UITextFlow = [
	{ text: 'Balance: ', style: { size: 20 } },
	{ text: '100.80', style: { bold: true, size: 20, textColor: 0xffcc00 } },
	{ text: '\nAvailable now', style: { italic: true, size: 16 } },
];
```

Every run requires string `text`, including empty strings. Optional `style`
accepts only `fontFamily`, `size`, `textColor`, `strokeColor`, `stroke`, `bold`
and `italic`. Font families are literal CSS names; colors are integer RGB values,
serialized as #RRGGBB. Sizes and outline widths must be finite and nonnegative.
Boolean false, numeric zero and empty text are retained. Style omission inherits
native TextField defaults, independently for each run. Empty style objects have
the same meaning as omission and canonical XML omits them.

Span elements are data, never display nodes, skin parts or independent lines.
Adjacent runs participate in one layout even when their styles differ. Wrapping
defaults to Unicode boundaries (`wordWrap=true`, `multiline=true`). Turning
multiline off renders only the first hard line without automatic wrapping.
Geometry and automatic min/max measurement remain ordinary component behavior.

Canonical XML writes actual line breaks, CR and tabs as numeric entities so XML
whitespace normalization cannot destroy them. Leading/trailing spaces, XML
entities and literal backslashes survive round trips. A backslash followed by
`n` stays text; use an actual LF or `&#10;` for a hard line break.
No HTML, markup parser, hyperlinks, underline or Label presets are authored.
`textFlow` cannot be put in an attribute or mixed with plain Label text.

## States, clearing and history

```xml
<Skin xmlns="https://kurot.dev/ui/1" class="skins.NoticeSkin" states="disabled">
    <RichLabel id="notice">
        <textFlow><Span text="Ready" bold="true" /></textFlow>
        <textFlow.disabled />
    </RichLabel>
</Skin>
```

`<textFlow.stateName>` overrides the entire array in that declared Skin state.
An empty property element means `[]`, explicitly clearing the content, while
omission means inheritance. Duplicate flows and undeclared states are errors.
Returning to Default restores the base flow. Changes use the normal property/
state operations and atomic history; they do not create a second undo stack.
Custom RichLabel subclasses may use the same XML property element; validate
their inheritance against the project's component registry after parsing.

`isUITextFlow` and the `text-flow` property format validate the complete supported
run shape. Generic array schemas cannot bind to this constrained format. Use
`validateUIAssetRegistry` for project resources and named state overrides;
`validateUIDocumentComponents` checks the base node properties and child policies.
Parsing rejects malformed flow syntax and run styles immediately.

## Adoption boundary

This kernel release alone does not make old compilers or materializers instantiate
the new components. Published CLI 3.3.1 and ui-runtime 0.8.2 depend on ^0.11.0,
which excludes 0.12.0, and lack the new built-in registrations. Adopting the new types requires explicit upgrades to published CLI 3.4.0
and ui-runtime 0.9.0, which include these integrations.
CLI requires document ^0.12.0; runtime requires document ^0.12.0, UI ^3.3.0 and
Core ^2.3.0. UI 3.3.0
already supplies the native classes; Core/UI need no further version bump for
this headless addition. Other SDKs, templates and existing projects remain on
their current contracts until they deliberately adopt the authoring feature.

Editor must remove its earlier private BitmapLabel definition before using this
foundation catalog, or duplicate registration will correctly fail. Consumers
with exhaustive `UIPropertyFormat` handling must account for `text-flow`.
