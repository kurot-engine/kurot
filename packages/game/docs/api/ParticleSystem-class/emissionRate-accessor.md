# emissionRate

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
get emissionRate(): number;
set emissionRate(value: number);
```

Interval between emissions in milliseconds; 0 disables emission. Non-finite
or negative values throw RangeError. Existing particles can continue updating.
