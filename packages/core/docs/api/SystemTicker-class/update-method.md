# update

Package: `@kurot/core@3.5.2`. Generated from public declarations and JSDoc.

```ts
update(forceUpdate: boolean): void;
```

Manually processes an update. In pause mode forceUpdate bypasses rendered
frame throttling. Continue mode consumes at most one due logical frame;
forcing never invents elapsed time. Automatic catch-up yields a task between
frames; manual drivers must preserve that boundary for promise callbacks.

**Default forceUpdate:** `false`
