# alpha

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
get alpha(): number;
set alpha(value: number);
```

Inherited from `alpha`; shown with this receiver's substituted types.

Opacity multiplier, initially 1; author values in [0, 1]. The setter stores
the supplied number without clamping. Alpha <= 0 suppresses rendering but is
not a way to unregister input or application callbacks.
