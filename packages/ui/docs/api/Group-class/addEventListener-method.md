# addEventListener

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
addEventListener<K extends string>(type: K, listener: (event: GroupEvents[K]) => void, useCapture?: boolean, priority?: number): void;
addEventListener(type: string, listener: (event: Event) => void, useCapture?: boolean, priority?: number): void;
```

Adds a listener with this dispatcher as its event source. The same
function/capture pair is registered once; larger priorities run first.
Preserve the function identity to remove it when its owner is disposed.
