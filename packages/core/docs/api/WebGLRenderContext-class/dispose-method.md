# dispose

Package: `@kurot/core@3.5.2`. Generated from public declarations and JSDoc.

```ts
dispose(): void;
```

Detaches this player's handlers and releases its GPU allocations, including
live subtree caches, without closing borrowed image sources or losing a
canvas shared with a future player.
