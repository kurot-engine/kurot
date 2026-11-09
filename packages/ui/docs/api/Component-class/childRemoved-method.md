# childRemoved

Package: `@kurot/ui@5.1.4`. Generated from public declarations and JSDoc.

```ts
childRemoved(_child: unknown, _index: number): void;
```

Extension hook before removal or reordering, while the child remains parented
at the supplied index. Actual removal dispatches its events after this hook.
