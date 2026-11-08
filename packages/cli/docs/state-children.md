# State-dependent children in compiled KUI skins

Requires CLI 5.1.0 or newer. Declare states on the Skin and list the states that own a visual child in
`includeIn`. Separate names with commas; an omitted attribute means the child
is present in every state.

```xml
<Skin class="skins.MenuSkin" xmlns="https://kurot.dev/ui/1" states="common,spec">
    <Group id="toolbar" includeIn="common">
        <Label id="hint" text="Menu" visible="false"/>
    </Group>
    <Button id="leave" includeIn="spec" label="Leave"/>
    <Image id="badge" includeIn="common, spec"/>
</Skin>
```

The factory creates each object once, including named parts of an inactive
group. On state entry, UI's native `AddItems` attaches the existing child
at its authored position among the siblings present in that state. On exit
it removes the child from its parent. A detached child does not occupy layout
space or participate in hit testing. Its fields, listeners and `visible` value
survive; application code and `visible.stateName` overrides still control visibility.

Use the directive on children of the Skin or an `elementsContent` container,
including nested groups. A property value such as a Scroller's single viewport
is not a state child. Unknown state names, empty lists and `includeIn.stateName`
are build errors. This is a compiled Skin feature and follows native Skin's
existing state initialization when the host joins a stage. Switching between two
listed states removes and reapplies their overrides; it does not recreate the part.

For migrating skins, keep the original state names and node IDs. For example,
`includeIn="common"` already expresses membership; do not substitute
`visible.spec="false"` if the business rule requires the node to leave the tree.
