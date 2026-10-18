# PositionedBitmapGlyph

Supporting declaration from `@kurot/bitmap-font`, reachable through the public API.
This page does not imply that the name is importable from the package root.
Use the owning API parameter/result type or an exported public alias when writing application code.

```ts
export interface PositionedBitmapGlyph {
    readonly character: string;
    /**
     * UTF-16 source offset, suitable for indexing the original JavaScript string.
     */
    readonly index: number;
    readonly line: number;
    /**
     * Pen position before applying the glyph's xOffset/yOffset.
     */
    readonly x: number;
    readonly y: number;
}
```
