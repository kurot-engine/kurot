# getResourceItem

Package: `@kurot/core@3.5.0`. Generated from public declarations and JSDoc.

```ts
getResourceItem(key: string): ResourceItem | undefined;
```

Return the owning definition for a name, unique manifest URL, declared subkey or sheet.frame.
Exact names/subkeys take precedence; the longest matching sheet name wins.

Related types: [ResourceItem](../ResourceItem-class.md).
