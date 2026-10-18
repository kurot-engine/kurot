# generateMovieClipData

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
generateMovieClipData(movieClipName: string): MovieClipData | undefined;
```

Generate a named clip; an empty/omitted name selects the first clip. Returns
undefined for missing data/name. Reuses the cached mutable data when enabled.
Malformed frame, timing, label or atlas metadata can throw RangeError. The
resource owner retains responsibility for the borrowed atlas and frame textures.

**Default movieClipName:** `''`

Related types: [MovieClipData](../MovieClipData-class.md).
