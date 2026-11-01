# BeginGradientFillCommand

Supporting declaration from `@kurot/core`, reachable through the public API.
This page does not imply that the name is importable from the package root.
Use the owning API parameter/result type or an exported public alias when writing application code.

```ts
/**
 * Linear or radial fill state. Colors, alphas, ratios and matrix are borrowed
 * from the drawing call; do not mutate them behind the raster cache.
 */
export interface BeginGradientFillCommand {
    type: PathCommandType.BeginGradientFill;
    gradientType: string;
    colors: number[];
    alphas: number[];
    /**
     * Gradient stop positions in [0, 255], paired with colors and alphas.
     */
    ratios: number[];
    /**
     * Optional gradient-space transform; undefined uses the renderer's default.
     */
    matrix: Matrix | undefined;
}
```

Related declarations: [Matrix](../../../../core/docs/api/Matrix-class.md).
