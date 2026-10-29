# data

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
data?: BitmapData;
```

Most recently completed BitmapData, initially undefined. close() retains it;
a new request does not clear an earlier result. Read after COMPLETE. The caller
owns disposal after all textures/users of this bitmap data have released it.

Related types: [BitmapData](../BitmapData-class.md).
