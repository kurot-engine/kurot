# getResponseHeader

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
getResponseHeader(header: string): string;
```

Return a named browser-exposed response header, or an empty string if absent.
Header access remains subject to native XMLHttpRequest/CORS behavior.
