# CustomFilterUniform

Package: `@kurot/core@3.5.1`. Generated from public declarations and JSDoc.

```ts
type CustomFilterUniform = number | boolean | readonly number[] | Float32Array | Int32Array;
```

Numeric uniforms are checked against the linked GLSL type and array length.
Matrices use column-major order; booleans may be boolean or 0/1.
