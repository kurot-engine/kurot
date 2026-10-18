# DrawCircleCommand

Supporting declaration from `@kurot/core`, reachable through the public API.
This page does not imply that the name is importable from the package root.
Use the owning API parameter/result type or an exported public alias when writing application code.

```ts
export interface DrawCircleCommand {
    type: PathCommandType.DrawCircle;
    x: number;
    y: number;
    r: number;
}
```
