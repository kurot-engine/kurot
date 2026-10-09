# BitmapLabel and RichLabel compilation

Native text compilation was introduced in CLI 3.4.0 with document 0.12.0.
Current CLI 3.5.0 requires published ui-document ^0.13.0 and retains these tags.
Applications rendering these tags
must install UI `^3.3.0` and Core `^2.3.0`; Core 2.3.1 fixes unstyled blank
rich-text line metrics. The CLI does not install or bundle its own Core/UI.
Document format version 2 and existing project configuration are unchanged.
Installing UI 3.4.0 requires Core ^2.4.0 for that package's centered-flip contract.

```xml
<Skin xmlns="https://kurot.dev/ui/1" class="TextSkin" states="disabled">
    <BitmapLabel id="score" text="100.80" font="score_font" />
    <RichLabel id="notice" width="240">
        <textFlow>
            <Span text="Balance: " size="20" />
            <Span text="100.80" size="20" bold="true" textColor="#FFCC00" />
        </textFlow>
        <textFlow.disabled />
    </RichLabel>
</Skin>
```

Register `score_font` as a `font` in default.res.json. Core's font analyzer loads
the descriptor and its image page; `style.json.fonts` describes vector fonts
and is a separate contract. BitmapLabel uses glyph metrics, not Label size,
colors or text presets. Scale the component when bitmap glyph scaling is needed.

RichLabel inherits Component, not Label. Its only content property is textFlow.
Supported Span styles are fontFamily, size, bold, italic, textColor, strokeColor
and stroke. Runs share continuous wrapping; omitted styles use native defaults
independently. Text, including spaces, backslashes and numeric-looking strings,
is literal. Use `&#10;` for explicit hard line breaks.

A state flow replaces the complete run array. `<textFlow.disabled />` clears
content, while an omitted state flow inherits it. Generated native SetProperty
overrides restore the prior array when removed. Span elements are not component
nodes; `.kurot/skin-parts.d.ts` exposes only the identified text components.

New text components reject unsupported properties and malformed base/state
values before emitting output. Existing CLI-only controls and project classes
retain their separate registration rules. Authored XML is never rewritten, and
failed builds retain the last good theme bundle and part declarations.

See the [shared authoring contract](../../ui-document/docs/text-components.md)
and [native RichLabel](../../ui/docs/rich-label.md). Existing apps that do not
use the new tags need no UI/Core upgrade just to update the CLI. Editor adoption
is separate; an old Editor does not acquire new authoring controls from a CLI upgrade.
