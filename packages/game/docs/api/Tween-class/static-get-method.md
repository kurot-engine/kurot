# static get

Package: `@kurot/game@3.0.0`. Generated from public declarations and JSDoc.

```ts
static get(target: object, options?: TweenOptions, override: boolean): Tween;
```

Creates a Tween for a target.
override removes existing target Tweens before registering this one.
Playback uses the shared Core ticker; no per-instance update is needed.

**Default override:** `false`

Related types: [Tween](../Tween-class.md), [TweenOptions](../TweenOptions-interface.md).
