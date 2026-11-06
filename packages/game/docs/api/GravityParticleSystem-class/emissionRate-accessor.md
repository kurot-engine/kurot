# emissionRate

Package: `@kurot/game@3.0.0`. Generated from public declarations and JSDoc.

```ts
get emissionRate(): number;
set emissionRate(value: number);
```

Inherited from `emissionRate`; shown with this receiver's substituted types.

Interval between emissions in milliseconds; 0 disables emission. Non-finite
or negative values throw RangeError. Existing particles can continue updating.
