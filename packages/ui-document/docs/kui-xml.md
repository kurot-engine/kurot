# KUI Skin XML format

KUI XML is the authored skin format consumed by Kurot Editor and
`@kurot/cli`. Files use the `.kui.xml` suffix and the namespace
`https://kurot.dev/ui/1`.

```xml
<?xml version="1.0" encoding="utf-8"?>
<Skin xmlns="https://kurot.dev/ui/1"
      xmlns:game="https://kurot.dev/components/game"
      class="game.TestSkin">
    <Group id="root" width="640" height="400">
        <Rect id="background" fillColor="#121D30" width="640" height="400" />
        <game:ActionCard id="play" />
    </Group>
</Skin>
```

The root has one authored identity: `class`, the generated skin class name.
Storage IDs, format versions, runtime targets, and default-skin flags are not
part of the file. Storage owns its record identity, while the CLI derives skin
associations from built-in and project component conventions.

The Skin contains exactly one visual root component. Built-in `kui.*` types
use unprefixed PascalCase tags. Project component types use an XML namespace
prefix; `game:ActionCard` maps to the semantic type `game.ActionCard`.

## Values

Primitive node properties are attributes. Unescaped `true` and `false` are
booleans and numeric literals are numbers. A string that looks like one of
those values starts with `\`; the parser removes that escape. Resource
properties use their keys directly; design tokens stay explicit:

```xml
<Image id="logo" source="ui.logo" />
<Rect id="background" fillColor="#121D30" />
<Rect id="accent" fillColor="@token:color:color.accent" />
```

Catalog-defined color properties use canonical `#RRGGBB` notation. The parser
also accepts `0xRRGGBB` when source is edited by hand; serialization normalizes
it back to `#RRGGBB`.

Group layouts keep the same property-element shape used by EUI rather than the
generic object form:

```xml
<Group id="content">
    <layout>
        <HorizontalLayout gap="8" verticalAlign="middle" />
    </layout>
    <Image id="icon" />
    <Label id="labelDisplay" />
</Group>
```

`BasicLayout`, `HorizontalLayout`, `VerticalLayout`, and `TileLayout` are
supported. The parser converts this syntax to the internal serializable layout
descriptor used by the editor and runtime.

## Parts and states

Every explicitly identified node below the visual root is available as a skin
part. The node `id` is the part name, so internal visual nodes can omit `id`
instead of maintaining names that have no runtime meaning.

Optional states are declared on the Skin. An override is written on its target
node as `property.state`, so an internal state target does not need an `id`.

```xml
<Skin xmlns="https://kurot.dev/ui/1" class="skins.ButtonSkin" states="up,down,disabled">
    <Group id="root">
        <Rect alpha.down="0.8" alpha.disabled="0.5" />
        <Label id="labelDisplay" />
    </Group>
</Skin>
```

`serializeUIDocument` emits a deterministic canonical form and validates the
semantic model before writing. Canonical output uses four-space indentation.
`parseUIDocument` accepts XML comments and an XML declaration, builds the
runtime-independent Skin document, then runs the same structural validation.
Screen and reusable-component semantic models remain programmatic APIs; they
do not share this authored Skin XML pipeline. Their parameters, Slots,
variants, data bindings, and actions are not Skin XML syntax.
