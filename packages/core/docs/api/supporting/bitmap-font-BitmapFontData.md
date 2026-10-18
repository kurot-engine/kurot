# BitmapFontData

Supporting declaration from `@kurot/bitmap-font`, reachable through the public API.
This page does not imply that the name is importable from the package root.
Use the owning API parameter/result type or an exported public alias when writing application code.

```ts
/**
 * Versioned interchange data. Parsed values are deeply frozen snapshots.
 * file may be omitted when a caller supplies its own texture.
 * Kerning keys are decimal Unicode code point pairs: "65,86".
 */
export interface BitmapFontData {
    readonly version: 1;
    readonly file?: string;
    readonly lineHeight: number;
    readonly baseline: number;
    readonly spaceAdvance: number;
    readonly glyphs: Readonly<Record<string, BitmapGlyph>>;
    readonly kernings: Readonly<Record<string, number>>;
}
```

Related declarations: [BitmapGlyph](../../../../core/docs/api/supporting/bitmap-font-BitmapGlyph.md).
