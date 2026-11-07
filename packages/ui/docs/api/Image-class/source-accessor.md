# source

Package: `@kurot/ui@5.1.2`. Generated from public declarations and JSDoc.

```ts
get source(): string | Texture | undefined;
set source(value: string | Texture | undefined);
```

Borrowed Texture or asset-adapter string, initially undefined. Direct textures
apply synchronously; strings load during property commit and dispatch COMPLETE
on success. Adapter callbacks with undefined clear the image. Image does not
forward IO_ERROR, and the default adapter does not report image-load failure
to the component; load through Resource first when failure handling is needed.
Only replies for the latest source assignment apply, including when a name
is reused. Stage removal does not cancel requests; clear/change source to
invalidate pending replies. Textures are never disposed by Image;
the asset provider/application must manage their lifetime.

Related types: [Texture](../../../../core/docs/api/Texture-class.md).
