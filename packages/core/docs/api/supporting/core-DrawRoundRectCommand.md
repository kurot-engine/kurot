# DrawRoundRectCommand

Supporting declaration from `@kurot/core`, reachable through the public API.
This page does not imply that the name is importable from the package root.
Use the owning API parameter/result type or an exported public alias when writing application code.

```ts
export interface DrawRoundRectCommand {
    type: PathCommandType.DrawRoundRect;
    x: number;
    y: number;
    w: number;
    h: number;
    ew: number;
    eh: number;
}
```
