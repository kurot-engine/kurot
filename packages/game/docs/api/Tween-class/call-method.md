# call

Package: `@kurot/game@3.0.0`. Generated from public declarations and JSDoc.

```ts
call(callback: (args: unknown[]) => void, params?: unknown[]): this;
```

Adds an unbound callback step with an optional argument array.
Runs only in forward playback; seeking and yoyo reverse passes skip it.
Use an arrow member or bind once when the callback needs instance state.
