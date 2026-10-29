# texture_frag

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
readonly texture_frag: "\nprecision lowp float;\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\nuniform sampler2D uSampler;\nvoid main(void) {\n    gl_FragColor = texture2D(uSampler, vTextureCoord) * vColor;\n}";
```

The declaration above is the available reference; no additional behavioral JSDoc is present.
