# BeginGradientFillCommand

Supporting declaration from `@kurot/core`, reachable through the public API.
This page does not imply that the name is importable from the package root.
Use the owning API parameter/result type or an exported public alias when writing application code.

```ts
export interface BeginGradientFillCommand {
    type: PathCommandType.BeginGradientFill;
    gradientType: string;
    colors: number[];
    alphas: number[];
    ratios: number[];
    matrix: Matrix | undefined;
}
```

Related declarations: [Matrix](../../../../core/docs/api/Matrix-class.md).
