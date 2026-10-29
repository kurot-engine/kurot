# pushDrawMultiTexture

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
pushDrawMultiTexture(multiCmd: MultiTextureDrawCmd): void;
```

Push a multi-texture batch draw command.
The caller is responsible for ensuring the VAO is in multi-texture mode
and that `multiCmd` contains the correct texture slot snapshot.

Related types: [MultiTextureDrawCmd](../supporting/core-MultiTextureDrawCmd.md).
