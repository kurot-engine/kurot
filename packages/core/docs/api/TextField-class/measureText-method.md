# measureText

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
measureText(width: number): { height: number; width: number };
```

Measures complete content in logical units without changing the rendered
field's viewport, scrolling or line caches. width defaults to NaN (unconstrained).
Finite non-negative widths constrain wrapping according to multiline/wordWrap.
Throws RangeError for a negative or non-finite width other than NaN.
Returns nominal text layout dimensions, including line spacing and rich styles.

**Default width:** `NaN`
