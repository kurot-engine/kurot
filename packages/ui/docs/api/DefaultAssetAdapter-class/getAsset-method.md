# getAsset

Package: `@kurot/ui@5.1.5`. Generated from public declarations and JSDoc.

```ts
getAsset(source: string, callback: (content: Texture | undefined, source: string) => void): void;
```

Resolves an asset and reports `undefined` when it cannot be loaded.
The callback receives the original source so callers can correlate requests.
