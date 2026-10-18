# removeEventListener

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
removeEventListener<K extends string>(type: K, listener: (event: TimerEvents[K]) => void, useCapture?: boolean): void;
removeEventListener(type: string, listener: (event: Event) => void, useCapture?: boolean): void;
```

Inherited from `removeEventListener`; shown with this receiver's substituted types.

Removes the matching event type, function identity and capture phase.
Missing listeners are harmless; a newly created bound function does not
match the original callback.
