# frameRate

Package: `@kurot/core@3.5.0`. Generated from public declarations and JSDoc.

```ts
get frameRate(): number;
set frameRate(value: number);
```

Frame-rate preference of the shared ticker, not a per-stage timer.
Explicit render requests can cause additional renders between scheduled frames.
