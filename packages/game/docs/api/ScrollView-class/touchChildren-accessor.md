# touchChildren

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
get touchChildren(): boolean;
set touchChildren(value: boolean);
```

Inherited from `Sprite.touchChildren`; shown with this receiver's substituted types.

Whether a hit child remains the input target, true by default. When false,
child hits are retargeted to this container; they are not individually disposed.
