# hitTestPoint

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
hitTestPoint(x: number, y: number, shapeFlag?: boolean): boolean;
```

Inherited from `Sprite.hitTestPoint`; shown with this receiver's substituted types.

Tests a point in logical stage coordinates. By default tests bounds and
rectangular clipping; shapeFlag = true additionally uses display hit testing.
A zero scale returns false. The bounds-only path is not an input-enabled check.
