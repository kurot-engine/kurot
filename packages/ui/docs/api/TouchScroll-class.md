# TouchScroll

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
class TouchScroll
```

Touch-scroll physics simulator.

Records velocity while the user drags, then computes a target position
and easing duration for the "throw" phase when the finger is released.

Usage:
1. Call `start(touchPoint)` on touch-begin.
2. Call `update(touchPoint, maxScroll, currentScroll)` on touch-move.
3. Call `finish(currentScroll, maxScroll)` on touch-end.

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](TouchScroll-class/constructor-constructor.md) |
| `bounces` | public | [open](TouchScroll-class/bounces-property.md) |
| `scrollFactor` | public | [open](TouchScroll-class/scrollFactor-property.md) |
| `finish` | public | [open](TouchScroll-class/finish-method.md) |
| `isPlaying` | public | [open](TouchScroll-class/isPlaying-method.md) |
| `isStarted` | public | [open](TouchScroll-class/isStarted-method.md) |
| `start` | public | [open](TouchScroll-class/start-method.md) |
| `stop` | public | [open](TouchScroll-class/stop-method.md) |
| `update` | public | [open](TouchScroll-class/update-method.md) |
