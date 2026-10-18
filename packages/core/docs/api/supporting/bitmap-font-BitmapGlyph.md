# BitmapGlyph

Supporting declaration from `@kurot/bitmap-font`, reachable through the public API.
This page does not imply that the name is importable from the package root.
Use the owning API parameter/result type or an exported public alias when writing application code.

```ts
/**
 * Single-page, unrotated glyph geometry. Coordinates use atlas pixels;
 * offsets, advances and logical dimensions use font design units.
 */
export interface BitmapGlyph {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly xOffset: number;
    readonly yOffset: number;
    readonly xAdvance: number;
    readonly logicalWidth: number;
    readonly logicalHeight: number;
}
```
