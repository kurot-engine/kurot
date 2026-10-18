# call

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
call(callback: (args: unknown[]) => void, thisObj?: object, params?: unknown[]): this;
```

Adds a callback step.
Runs only in forward playback; seeking and yoyo reverse passes skip it.
