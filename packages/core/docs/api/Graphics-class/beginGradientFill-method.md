# beginGradientFill

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
beginGradientFill(gradientType: string, colors: number[], alphas: number[], ratios: number[], matrix?: Matrix): void;
```

Begins a linear/radial fill for subsequent paths. Colors use 0xRRGGBB,
alphas use [0, 1], and ratios use [0, 255]. The optional Matrix transforms
the gradient. Arrays/matrix are retained in the command; keep their values stable.

Related types: [Matrix](../Matrix-class.md).
