# dispatchEvent

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
dispatchEvent(event: Event): boolean;
```

Inherited from `dispatchEvent`; shown with this receiver's substituted types.

Dispatches synchronously; bubbling events traverse display ancestors through
capture, target and bubble phases. Returns false when default is prevented.
Do not retain pooled event instances after their dispatch owner releases them.

Related types: [Event](../Event-class.md).
