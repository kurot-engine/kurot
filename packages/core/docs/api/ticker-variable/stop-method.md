# stop

Package: `@kurot/core@3.4.0`. Generated from public declarations and JSDoc.

```ts
stop(): void;
```

Cancels all owned animation-frame, timeout and catch-up tasks without clearing players, tick
callbacks, deferred calls or pause state. Registration owners must detach
their own callbacks; stop() alone does not dispose them. Continue mode discards
unprocessed debt and excludes the stopped interval on the next start().
