# setHandler

Package: `@kurot/ui@4.1.0`. Generated from public declarations and JSDoc.

```ts
setHandler(handler: (value: unknown) => void, thisObject: unknown): void;
```

Replace the chain's handler and callback receiver. Does not immediately emit
the current value; call getValue() for an initial read. Handler errors propagate.
