# setFrameRate

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
setFrameRate(value: number): boolean;
```

Updates the requested frame rate in frames per second. Returns false for
values <= 0 or an unchanged value; scheduling caps at 60 even when the
reported requested value is larger. Supply a finite positive number.
