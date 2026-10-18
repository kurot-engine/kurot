# Centered display flips

`flipX` and `flipY` are independent boolean DisplayObject properties, defaulting
to false. They mirror content across the horizontal or vertical center of its
local frame before the authored scale, rotation and skew. Position, anchors and
scale values are preserved. Negative scale retains its existing origin-based
meaning; combining it with a flip composes both transforms.

```ts
image.flipX = true;
image.scaleX = 0.5; // The horizontal reflection remains enabled.
```

Ordinary Core display objects use their local content bounds, including a
nonzero bounds origin and child content. UI Group and all Component subclasses
use their validated unscaled layout rectangle, including empty space. A
scrollRect uses its visible viewport as the reflection frame; scrolling still
translates the content within that fixed viewport. External masks retain their
existing independent coordinate space.

UI layout remains deferred. Validate the component before reading coordinates
or rendering manually. Percentage and edge allocation, intrinsic sizes, anchor
positions and parent layout bounds remain independent of centered flips.
Resizing updates the reflection center. Nested flips compose normally.

Rendering, localToGlobal/globalToLocal, hit tests, display-list caches, effects
and render groups consume the same effective transform. `matrix` stays the
copy of the authored transform without flips or anchor/scroll offsets; assigning
it preserves both flags. Internal `$getMatrix()` includes the reflection and
anchor compensation. Custom rendering integrations must use the effective
matrix's translation instead of assuming that it equals x/y.

```xml
<Skin xmlns="https://kurot.dev/ui/1" class="ui.FlipExample" states="down">
    <Image id="background" width="100%" height="100%"
           flipY="true" flipY.down="false" />
</Skin>
```

Flags are inherited from the headless DisplayObject catalog, use real booleans,
and support normal state/history/data-binding restoration. CLI rejects malformed
values and flags on the nonvisual Skin root. No existing negative-scale XML is
converted automatically. The document format remains version 2.

## Integration

Core supplies the effective transform; native Group/Component supplies its layout
frame. ui-document validates boolean attributes, CLI compiles them, and ui-runtime
applies them during materialization and state restoration. CLI-built games do
not require ui-runtime. Use the [dependency graph](dependency-policy.md) for
current peers; a host must satisfy both UI and runtime's Core requirements.

## Verification

Native Core/UI unit tests cover nonzero bounds, signed scale, rotated/skewed
anchors, matrix round trips, defaults, input coordinates, scroll viewports,
parent content changes, all common UI bases and popup reparenting. Headless,
compiler and runtime tests cover booleans, states, undo/redo and typed data.
Minified browser tests exercise Canvas, WebGL 1 and WebGL 2 with asymmetric
pixels, percent resizing, sparse parent frames, native clips, ancestor/self
caches and render groups. GPU assertions read the current framebuffer directly.
