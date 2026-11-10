# isCachedAsTexture

Package: `@kurot/core@3.5.2`. Generated from public declarations and JSDoc.

```ts
get isCachedAsTexture(): boolean;
```

Whether a display-list texture cache currently exists, initially false.
Storage follows the active backend: GPU texture for WebGL, bitmap for Canvas.
