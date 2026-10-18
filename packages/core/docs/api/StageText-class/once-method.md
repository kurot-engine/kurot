# once

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
once<K extends string>(type: K, listener: (event: Event) => void, useCapture?: boolean, priority?: number): void;
once(type: string, listener: (event: Event) => void, useCapture?: boolean, priority?: number): void;
```

Inherited from `once`; shown with this receiver's substituted types.

Registers a listener that removes itself after notification. If its owner
closes before the event occurs, remove it explicitly using the same
callback and capture phase.
