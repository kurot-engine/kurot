# LineToCommand

Supporting declaration from `@kurot/core`, reachable through the public API.
This page does not imply that the name is importable from the package root.
Use the owning API parameter/result type or an exported public alias when writing application code.

```ts
/**
 * Adds a straight segment from the current position to (x, y).
 */
export interface LineToCommand {
    type: PathCommandType.LineTo;
    x: number;
    y: number;
}
```
