# currentCount

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
get currentCount(): number;
```

Number of timer firings since construction or reset(), initially 0.
stop()/start() preserve this count; reset() clears it.
