# setupLifecycle

Package: `@kurot/core@3.6.0`. Generated from public declarations and JSDoc.

```ts
setupLifecycle(stage: Stage, options: LifecycleOptions): () => void;
```

Sets up visibility change listeners to dispatch ACTIVATE/DEACTIVATE
events on the stage when the page is hidden/shown. Visibility never clears a
business pause. Configure before start(); defaults to backgroundPolicy: 'pause'.
The disposer removes listeners and stops continuous scheduling. Continue mode
cannot execute while the browser freezes JavaScript; it replays on delivery.

**Default options:** `{}`

Related types: [Stage](Stage-class.md), [LifecycleOptions](LifecycleOptions-interface.md).
