# multi_frag

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
readonly multi_frag: "\nprecision lowp float;\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\nvarying float vTextureId;\nuniform sampler2D uSamplers[8];\nvoid main(void) {\n    vec4 color;\n    int id = int(vTextureId + 0.5);\n    if (id == 0)      color = texture2D(uSamplers[0], vTextureCoord);\n    else if (id == 1) color = texture2D(uSamplers[1], vTextureCoord);\n    else if (id == 2) color = texture2D(uSamplers[2], vTextureCoord);\n    else if (id == 3) color = texture2D(uSamplers[3], vTextureCoord);\n    else if (id == 4) color = texture2D(uSamplers[4], vTextureCoord);\n    else if (id == 5) color = texture2D(uSamplers[5], vTextureCoord);\n    else if (id == 6) color = texture2D(uSamplers[6], vTextureCoord);\n    else              color = texture2D(uSamplers[7], vTextureCoord);\n    gl_FragColor = color * vColor;\n}";
```

The declaration above is the available reference; no additional behavioral JSDoc is present.
