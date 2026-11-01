# DrawRectCommand

Supporting declaration from `@kurot/core`, reachable through the public API.
This page does not imply that the name is importable from the package root.
Use the owning API parameter/result type or an exported public alias when writing application code.

```ts
/**
 * Rectangle with top-left origin and logical width/height w/h.
 */
export interface DrawRectCommand {
    type: PathCommandType.DrawRect;
    x: number;
    y: number;
    w: number;
    h: number;
}
```
