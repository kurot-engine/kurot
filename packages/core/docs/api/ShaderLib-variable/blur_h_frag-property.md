# blur_h_frag

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
readonly blur_h_frag: "\nprecision mediump float;\nuniform float blurX;\nuniform sampler2D uSampler;\nvarying vec2 vTextureCoord;\nuniform vec2 uTextureSize;\nvoid main() {\n    float step = 1.0 / uTextureSize.x;\n    vec4 color = vec4(0.0);\n    float total = 0.0;\n    for (int i = -8; i <= 8; i++) {\n        if (abs(float(i)) > blurX) continue;\n        float weight = 1.0 - abs(float(i)) / (blurX + 1.0);\n        color += texture2D(uSampler, vTextureCoord + vec2(float(i) * step, 0.0)) * weight;\n        total += weight;\n    }\n    gl_FragColor = color / total;\n}";
```

The declaration above is the available reference; no additional behavioral JSDoc is present.
