# dispatchEvent

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
dispatchEvent(event: Event): boolean;
```

Inherited from `Sprite.dispatchEvent`; shown with this receiver's substituted types.

Dispatches synchronously; bubbling events traverse display ancestors through
capture, target and bubble phases. Returns false when default is prevented.
Do not retain pooled event instances after their dispatch owner releases them.

Related types: [Event](../../../../core/docs/api/Event-class.md).
