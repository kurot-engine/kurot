# childRemoved

Package: `@kurot/ui@3.7.0`. Generated from public declarations and JSDoc.

```ts
childRemoved(child: unknown, index: number): void;
```

Inherited from `childRemoved`; shown with this receiver's substituted types.

Extension hook before removal or reordering, while the child remains parented
at the supplied index. Actual removal dispatches its events after this hook.
