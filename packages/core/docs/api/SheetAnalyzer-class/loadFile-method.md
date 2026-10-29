# loadFile

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
loadFile(item: ResourceItem): Promise<ResourceItem>;
```

Load a sheet resource. This involves two steps:
1. Load the JSON config via HttpRequest
2. Load the referenced image via ImageLoader
3. Parse into a SpriteSheet

Related types: [ResourceItem](../ResourceItem-class.md).
