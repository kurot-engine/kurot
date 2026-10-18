# colorTransform_frag

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
readonly colorTransform_frag: "\nprecision mediump float;\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\nuniform mat4 matrix;\nuniform vec4 colorAdd;\nuniform sampler2D uSampler;\nvoid main(void) {\n    vec4 texColor = texture2D(uSampler, vTextureCoord);\n    if (texColor.a > 0.0) {\n        texColor = vec4(texColor.rgb / texColor.a, texColor.a);\n    }\n    vec4 locColor = clamp(texColor * matrix + colorAdd, 0.0, 1.0);\n    gl_FragColor = vColor * vec4(locColor.rgb * locColor.a, locColor.a);\n}";
```

The declaration above is the available reference; no additional behavioral JSDoc is present.
