# DrawArcCommand

Supporting declaration from `@kurot/core`, reachable through the public API.
This page does not imply that the name is importable from the package root.
Use the owning API parameter/result type or an exported public alias when writing application code.

```ts
export interface DrawArcCommand {
    type: PathCommandType.DrawArc;
    x: number;
    y: number;
    r: number;
    start: number;
    end: number;
    ccw: boolean;
}
```
