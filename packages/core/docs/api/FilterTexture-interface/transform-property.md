# transform

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
transform?: readonly [number, number, number, number, number, number];
```

Affine transform [a,b,c,d,tx,ty] from filter UV to image UV.
Defaults to [1,0,0,-1,0,1], converting bottom-left filter UVs to
top-left image UVs. Uploaded as <samplerName>Matrix (mat3).
<samplerName>Clamp (vec4) contains the image's texel-center UV bounds.
