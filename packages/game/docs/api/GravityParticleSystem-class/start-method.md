# start

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
start(duration: number): void;
```

Inherited from `start`; shown with this receiver's substituted types.

Start emitting on the shared Core ticker. Duration defaults to -1 for unlimited
emission; positive values are milliseconds. Does nothing when emissionRate is 0.
Stage removal does not unregister this callback; call stop(true) on disposal.

**Default duration:** `-1`
