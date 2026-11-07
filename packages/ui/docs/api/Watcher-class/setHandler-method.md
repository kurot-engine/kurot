# setHandler

Package: `@kurot/ui@5.1.2`. Generated from public declarations and JSDoc.

```ts
setHandler(handler: (value: unknown) => void): void;
```

Replace the chain's unbound handler. Does not immediately emit
the current value; call getValue() for an initial read. Handler errors propagate.
