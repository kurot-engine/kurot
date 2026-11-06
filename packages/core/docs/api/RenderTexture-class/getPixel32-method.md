# getPixel32

Package: `@kurot/core@3.1.0`. Generated from public declarations and JSDoc.

```ts
getPixel32(x: number, y: number): number[];
```

Reads one RGBA pixel as four values in [0, 255]. Coordinates are divided by
textureScaleFactor and rounded to capture pixels. Returns [] without a usable
capture; Canvas security/readback errors propagate to the caller.
