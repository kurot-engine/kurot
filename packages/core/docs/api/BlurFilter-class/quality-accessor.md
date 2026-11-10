# quality

Package: `@kurot/core@3.5.1`. Generated from public declarations and JSDoc.

```ts
get quality(): number;
set quality(value: number);
```

Number of horizontal/vertical pass pairs, from 1 to 16 (WebGL only).
Each pair uses radius / sqrt(quality), preserving approximate blur variance.
