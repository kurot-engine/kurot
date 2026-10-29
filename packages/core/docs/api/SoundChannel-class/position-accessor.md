# position

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
get position(): number;
```

Playback offset in seconds within the current audio iteration, initially
the requested start offset. Web Audio wraps on repeats and reports duration
at finite completion. Manual HTML stop resets its reported position to 0.
