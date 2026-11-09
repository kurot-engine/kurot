# childRemoved

Package: `@kurot/ui@5.2.1`. Generated from public declarations and JSDoc.

```ts
childRemoved(_child: unknown, _index: number): void;
```

Inherited from `childRemoved`; shown with this receiver's substituted types.

Extension hook before removal or reordering, while the child remains parented
at the supplied index. Actual removal dispatches its events after this hook.
