# frameRate

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
get frameRate(): number;
```

Requested rendered frame rate in frames per second, initially 30 for a
standalone ticker. createPlayer() normally sets the shared rate to 60.
Actual frame scheduling caps at 60 and remains browser-timing dependent.
