# removeEventListener

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
removeEventListener<K extends string>(type: K, listener: (event: GroupEvents[K]) => void, useCapture?: boolean): void;
removeEventListener(type: string, listener: (event: Event) => void, useCapture?: boolean): void;
```

Removes the matching event type, function identity and capture phase.
Missing listeners are harmless; a newly created bound function does not
match the original callback.
