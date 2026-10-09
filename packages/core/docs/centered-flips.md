# Centered display flips (Core 2.4.0)

Core 2.4.0 is published, verified on npm on 2026-10-09. `flipX` and `flipY` are boolean DisplayObject
properties, defaulting to false and inherited by all display subclasses.

```ts
sprite.flipX = true;
sprite.scaleX = 0.5;
```

Reflection uses the local content bounds center, including nonzero origins.
UI 3.4 supplies the actual unscaled layout frame instead. A scrollRect uses its
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
masks retain their independent coordinates. No existing negative-scale skin or
application is converted automatically. Core keeps bitmap-font ^0.1.0 and needs
no new runtime dependency. UI alone requires a new Core minimum when adopting
its frame hook; other SDKs with Core 2.x peers can adopt Core optionally.

The repository [adoption contract](../../../docs/centered-flips.md) records
headless/compiler/runtime versions and publication order. UI development now
installs registry Core 2.4.0 without local overrides. UI 3.4.0 and document
0.13.0, CLI 3.5.0 and runtime 0.10.0 are also published. Consumers adopt each installation/lock explicitly and rebuild.
