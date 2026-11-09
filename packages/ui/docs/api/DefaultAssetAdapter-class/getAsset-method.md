# getAsset

Package: `@kurot/ui@5.2.0`. Generated from public declarations and JSDoc.

```ts
getAsset(source: string, callback: (content: Texture | undefined, source: string) => void): void;
```

Complete each request once, with a borrowed texture or undefined on failure.
Return the original source even when looking up a frame through its sheet.
An adapter with a cached texture should call back synchronously.
