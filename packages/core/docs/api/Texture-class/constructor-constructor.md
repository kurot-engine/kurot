# constructor

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
constructor(resolution: number);
```

Creates an empty texture at source-pixels-per-logical-unit resolution,
defaulting to 1. Non-positive/non-finite resolution throws RangeError; it is
immutable and independent of the Player's backing-store resolution.

**Default resolution:** `1`

Related types: [Texture](../Texture-class.md).
