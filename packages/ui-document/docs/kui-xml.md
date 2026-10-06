# KUI Skin XML format

KUI XML is the authored skin format consumed by Kurot Editor and
`@kurot/cli`. Files use the `.kui.xml` suffix and the namespace
`https://kurot.dev/ui/1`.

```xml
<?xml version="1.0" encoding="utf-8"?>
<Skin xmlns="https://kurot.dev/ui/1"
      xmlns:game="https://kurot.dev/components/game"
      class="game.TestSkin"
      width="640"
      height="400">
    <Rect id="background" fillColor="#121D30" width="640" height="400" />
    <game:ActionCard id="play" />
</Skin>
```

The root has one authored identity: `class`, the generated skin class name.
Storage IDs, format versions, runtime targets, and default-skin flags are not
part of the file. Storage owns its record identity, while the CLI derives skin
associations from built-in and project component conventions.

The Skin is the visual root container. Its layout and size properties belong on
`<Skin>`, and its visual children are written directly inside it; an extra root
`<Group>` has no meaning. A nested Group remains valid when the design actually
needs a separate layout container. Built-in `kui.*` types use unprefixed
PascalCase tags. Project component types use an XML namespace prefix;
`game:ActionCard` maps to the semantic type `game.ActionCard`.

## Values

Primitive node properties are attributes. Schema-defined string properties,
including `text`, `label` and their state overrides, contain literal strings:
`text="100.80"` retains the decimal formatting, and `text="false"` is text.
No backslash type escape is added or removed for these properties. XML entities
such as `&amp;` and `&quot;` still escape XML syntax.

Other property types retain scalar inference: `true` and `false` are booleans,
and numeric literals are numbers. Schema-free ArrayCollection Object attributes
and union-valued properties still use a leading `\` for strings that would
otherwise be interpreted as another type. Resource properties use their keys
directly; stylesheet colors stay explicit:

```xml
<Image id="logo" source="ui.logo" />
<Rect id="background" fillColor="#121D30" />
<Rect id="accent" fillColor="@style:colors:color.accent" />
<Label id="amount" text="100.80" size="48" />
```

`@style:colors:<key>` references the `colors` section of project `style.json`.
Other stylesheet sections are not yet supported in XML. The previous
`@token:color:<key>` prefix is rejected. Other semantic token categories retain
their `@token:<type>:<key>` syntax. These prefixes never reinterpret literal
string properties such as Label text.

This literal-string rule is a breaking change in 0.8.0. Earlier generated
type escapes in string properties, such as `text="\100.80"`, now represent a
literal backslash. Remove an old synthetic prefix explicitly when adopting the
new parser; files are not automatically migrated. Editor and CLI must use the
same parser contract.

Catalog-defined color properties use canonical `#RRGGBB` notation. The parser
also accepts `0xRRGGBB` when source is edited by hand; serialization normalizes
it back to `#RRGGBB`.

Fixed and percentage sizes share the authored `width` and `height` attributes.
A number is a fixed pixel size; a value with a `%` suffix is relative to the
parent. `percentWidth` and `percentHeight` remain internal semantic properties
and are not authored XML attributes.

```xml
<Group width="320" height="80" />
<Group width="100%" height="75%" />
```

One axis cannot define both a fixed and percentage size. State-specific sizes
use the same syntax, for example `width.compact="50%"`.

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

DataGroup, List, TabBar, and ComboBox can declare a data provider with an
`ArrayCollection` property element. Each `Object` contains scalar attributes;
the serialized document stores them as an ArrayCollection descriptor rather
than child display nodes:

```xml
<List itemRendererSkinName="skins.ItemRendererSkin">
    <ArrayCollection>
        <Array>
            <Object label="First" value="1" />
            <Object label="Second" value="2" />
        </Array>
    </ArrayCollection>
    <layout>
        <VerticalLayout gap="8" />
    </layout>
</List>
```

The item renderer skin belongs to each generated row. The collection and
layout are independent properties of the container.

## Label text layout

The 0.9.0 foundation catalog accepts a single-line Label fitting policy:

```xml
<Label text="KZT 10 000,00" width="140" size="24"
       multiline="false" textFit="shrink" minFontSize="16" />
```

`textFit` is `none` by default and may be `shrink` on Label. `minFontSize` must
be finite and at least 1. EditableText accepts only `none`. Authored `size` and
state sizes are preserved; `renderedSize` and `textFitOverflow` are runtime
observations and cannot be authored. Omitted catalog defaults stay omitted.
See [text authoring](text-layout.md) for the complete contract and matching
compiler/runtime requirements.

## Parts and states

Every explicitly identified node inside the Skin is available as a skin
part. The node `id` is the part name, so internal visual nodes can omit `id`
instead of maintaining names that have no runtime meaning.

Optional states are declared on the Skin. An override is written on its target
node as `property.state`, so an internal state target does not need an `id`.

```xml
<Skin xmlns="https://kurot.dev/ui/1" class="skins.ButtonSkin" states="up,down,disabled">
    <Rect alpha.down="0.8" alpha.disabled="0.5" />
    <Label id="labelDisplay" />
</Skin>
```

`serializeUIDocument` emits a deterministic canonical form and validates the
semantic model before writing. Canonical output uses four-space indentation.
`parseUIDocument` accepts XML comments and an XML declaration, builds the
runtime-independent Skin document, then runs the same structural validation.
Screen and reusable-component semantic models remain programmatic APIs; they
do not share this authored Skin XML pipeline. Their parameters, Slots,
variants, data bindings, and actions are not Skin XML syntax.
