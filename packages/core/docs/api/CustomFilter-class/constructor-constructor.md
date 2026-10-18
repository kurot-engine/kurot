# constructor

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
constructor(vertexSrc: string, fragmentSrc: string, uniforms: Record<string, CustomFilterUniform>);
```

Uses this exact source pair on either WebGL backend. Uniform values must
match linked GLSL types. An empty vertex source selects the standard vertex.

**Default uniforms:** `{}`

Related types: [CustomFilter](../CustomFilter-class.md), [CustomFilterUniform](../CustomFilterUniform-typealias.md).
