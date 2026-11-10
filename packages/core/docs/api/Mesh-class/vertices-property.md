# vertices

Package: `@kurot/core@3.5.1`. Generated from public declarations and JSDoc.

```ts
vertices: number[];
```

Vertex positions stored as x/y pairs in local display coordinates.
Atlas trim offsets do not move this geometry; positions already define
the rendered shape. Arrays are retained directly; call updateVertices()
after replacing or editing geometry so bounds and rendering are invalidated.

**Default/initializer:** `[]`
