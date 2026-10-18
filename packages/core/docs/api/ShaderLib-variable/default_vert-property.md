# default_vert

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
readonly default_vert: "\nattribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\nattribute vec4 aColor;\nuniform vec2 projectionVector;\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\nconst vec2 center = vec2(-1.0, 1.0);\nvoid main(void) {\n   gl_Position = vec4((aVertexPosition / projectionVector) + center, 0.0, 1.0);\n   vTextureCoord = aTextureCoord;\n   vColor = aColor;\n   }";
```

The declaration above is the available reference; no additional behavioral JSDoc is present.
