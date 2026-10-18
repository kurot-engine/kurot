# BitmapTextLayout

Supporting declaration from `@kurot/bitmap-font`, reachable through the public API.
This page does not imply that the name is importable from the package root.
Use the owning API parameter/result type or an exported public alias when writing application code.

```ts
export interface BitmapTextLayout {
    readonly glyphs: readonly PositionedBitmapGlyph[];
    readonly lines: readonly BitmapTextLine[];
    readonly width: number;
    readonly height: number;
    readonly startX: number;
    readonly startY: number;
    /**
     * Union of logical line boxes and painted glyphs, including negative bearings.
     */
    readonly bounds: {
        readonly x: number;
        readonly y: number;
        readonly width: number;
        readonly height: number;
    };
}
```

Related declarations: [PositionedBitmapGlyph](../../../../core/docs/api/supporting/bitmap-font-PositionedBitmapGlyph.md), [BitmapTextLine](../../../../core/docs/api/supporting/bitmap-font-BitmapTextLine.md).
