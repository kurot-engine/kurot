# delay

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
get delay(): number;
set delay(value: number);
```

Delay in milliseconds. Assignments below 1 clamp to 1; values such as NaN
are not rejected. Provide a finite positive number. Timing follows ticker
updates and cannot guarantee wall-clock precision during browser stalls.
