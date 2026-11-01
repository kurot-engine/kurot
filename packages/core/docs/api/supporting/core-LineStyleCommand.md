# LineStyleCommand

Supporting declaration from `@kurot/core`, reachable through the public API.
This page does not imply that the name is importable from the package root.
Use the owning API parameter/result type or an exported public alias when writing application code.

```ts
/**
 * Stroke state for subsequent geometry. Thickness and dash lengths are logical
 * units; alpha is in [0, 1] and color is RGB.
 */
export interface LineStyleCommand {
    type: PathCommandType.LineStyle;
    thickness: number;
    color: number;
    alpha: number;
    /**
     * Cap style, with undefined selecting 'none' (Canvas 'butt').
     */
    caps: string | undefined;
    /**
     * Join style, with undefined selecting 'round'.
     */
    joints: string | undefined;
    /**
     * Maximum miter length as a multiple of stroke thickness.
     */
    miterLimit: number;
    /**
     * Borrowed dash/gap lengths; undefined leaves the Canvas dash state unchanged.
     */
    lineDash: number[] | undefined;
}
```
