# LineStyleCommand

Supporting declaration from `@kurot/core`, reachable through the public API.
This page does not imply that the name is importable from the package root.
Use the owning API parameter/result type or an exported public alias when writing application code.

```ts
export interface LineStyleCommand {
    type: PathCommandType.LineStyle;
    thickness: number;
    color: number;
    alpha: number;
    caps: string | undefined;
    joints: string | undefined;
    miterLimit: number;
    lineDash: number[] | undefined;
}
```
