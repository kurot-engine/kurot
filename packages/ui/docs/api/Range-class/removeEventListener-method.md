# removeEventListener

Package: `@kurot/ui@5.1.3`. Generated from public declarations and JSDoc.

```ts
removeEventListener<K extends string>(type: K, listener: (event: ComponentEvents[K]) => void, useCapture?: boolean): void;
removeEventListener(type: string, listener: (event: Event) => void, useCapture?: boolean): void;
```

Inherited from `removeEventListener`; shown with this receiver's substituted types.

Removes the matching listener and capture mode. Removing the last listener
for ENTER_FRAME or RENDER also removes this node from that ticker registry.

Removes a custom event listener with the matching callback and capture mode.
