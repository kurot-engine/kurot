# loadFile

Package: `@kurot/core@3.5.0`. Generated from public declarations and JSDoc.

```ts
loadFile(item: ResourceItem): Promise<ResourceItem>;
```

Load a single owning item without scheduling a batch. Concurrent callers
of this loader share analyzer work by resource name, including batch loads.
A settled request is removed before callers resume, so failures can retry.

Related types: [ResourceItem](../ResourceItem-class.md).
