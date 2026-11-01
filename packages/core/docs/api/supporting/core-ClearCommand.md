# ClearCommand

Supporting declaration from `@kurot/core`, reachable through the public API.
This page does not imply that the name is importable from the package root.
Use the owning API parameter/result type or an exported public alias when writing application code.

```ts
/**
 * Disables fill/stroke state during replay; it does not erase earlier pixels.
 * Graphics.clear() instead empties the retained array and resets its raster surface.
 */
export interface ClearCommand {
    type: PathCommandType.Clear;
}
```
