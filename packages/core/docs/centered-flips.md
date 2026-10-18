# Centered display flips

`flipX` and `flipY` are boolean DisplayObject
properties, defaulting to false and inherited by all display subclasses.

```ts
sprite.flipX = true;
sprite.scaleX = 0.5;
```

Reflection uses the local content bounds center, including nonzero origins.
UI supplies the actual unscaled layout frame instead. A scrollRect uses its
visible viewport. Authored position, scale, rotation, skew and anchors are
preserved. Negative scale continues to act around the authored anchor; combining
negative scale and a centered flag applies both. Resizing/content changes update
the center. Nested flags compose with ancestors normally.

`matrix` is the authored transform copy without centered flags or anchor/scroll
offsets. Reassigning that matrix retains the flags. Internal `$getMatrix()` is
the effective transform, including anchor compensation; rendering integrations
must read its tx/ty rather than substituting x/y. Override `$getFlipBounds()`
only when a display subclass owns a different local reflection frame.

Canvas/WebGL rendering, local/global coordinate conversion, hits, clips,
display-list caches and render groups use that effective transform. External
masks retain their independent coordinates. Negative scale and centered flags remain separate authored operations. See the
[shared flip contract](../../../docs/centered-flips.md) for authoring, runtime
integration and current verification scope.
