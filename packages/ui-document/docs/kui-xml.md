# KUI XML format

KUI XML is the single authored source format for Kurot UI screens, reusable
components, and skins. Files use the `.kui.xml` suffix and the namespace
`https://kurot.dev/ui/1`.

```xml
<?xml version="1.0" encoding="utf-8"?>
<Screen xmlns="https://kurot.dev/ui/1"
        xmlns:game="https://kurot.dev/components/game"
        id="main" version="2">
    <Group id="root" width="640" height="400">
        <Label id="title" text="Kurot" />
        <game:ActionCard id="play" />
    </Group>
</Screen>
```

The document root is `Screen`, `Component`, or `Skin`. A `Component` declares
its published type with `type`; a `Skin` declares its runtime target with
`target`.

```xml
<Component xmlns="https://kurot.dev/ui/1"
           id="action-card" version="2" type="game.ActionCard">
    <Group id="root" />
</Component>

<Skin xmlns="https://kurot.dev/ui/1"
      id="primary-button" version="2" target="kui.Button" default="true">
    <Group id="root" />
</Skin>
```

`default="true"` marks the Skin as the default appearance for `target`. Build
tools derive their theme mapping from this metadata. The Skin's single root
component is a real visual node and remains present when the document is
materialized or compiled.

Built-in `kui.*` types use unprefixed PascalCase tags. Project component types
use an XML namespace prefix. The prefix is also the semantic type namespace:
`game:ActionCard` maps to `game.ActionCard`.

## Values

Primitive node properties are attributes. Unescaped `true` and `false` are
booleans and numeric literals are numbers. A string that looks like one of
those values starts with `\`; the parser removes that escape. References use
explicit forms:

```xml
<Image id="logo" source="@resource:image:ui.logo" />
<Rect id="background" fillColor="@token:color:color.panel" />
```

Arrays and objects use a `properties` block so structured values remain typed
without embedded JSON:

```xml
<Group id="list">
    <properties>
        <property name="layout">
            <object>
                <value name="gap" value="8" />
                <value name="direction" value="vertical" />
            </object>
        </property>
    </properties>
</Group>
```

## Contracts and instances

Optional `contract` metadata precedes the root component. It declares
parameters, parts, slots, states, variants, data fields, bindings, and actions.
Reusable instances store their source and local differences only.

```xml
<game:ActionCard id="play">
    <instance source="action-card" variant="primary">
        <parameter name="label" value="Play" />
        <override part="label" property="textColor" value="16777215" />
        <slot name="content">
            <Label id="hint" text="Start game" />
        </slot>
    </instance>
</game:ActionCard>
```

`serializeUIDocument` emits a deterministic canonical form and validates the
semantic model before writing. Canonical output uses four-space indentation.
`parseUIDocument` accepts XML comments and an
XML declaration, builds the runtime-independent `UIDocument`, then runs the
same structural validation.
