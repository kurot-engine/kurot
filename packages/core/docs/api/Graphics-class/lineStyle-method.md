# lineStyle

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
lineStyle(thickness: number, color: number, alpha: number, _pixelHinting: boolean, _scaleMode: string, caps?: string, joints?: string, miterLimit: number, lineDash?: number[]): void;
```

Sets the stroke used by subsequent geometry in local logical units.
Defaults: thickness NaN (no new stroke command), black, alpha 1, miterLimit 3.
Zero/non-positive thickness adds no LineStyle command; it does not erase an
already recorded stroke. pixelHinting and scaleMode are currently ignored.

**Default thickness:** `NaN`

**Default color:** `0`

**Default alpha:** `1`

**Default _pixelHinting:** `false`

**Default _scaleMode:** `'normal'`

**Default miterLimit:** `3`
