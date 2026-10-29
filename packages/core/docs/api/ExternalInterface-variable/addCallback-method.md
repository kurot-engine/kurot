# addCallback

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
addCallback(functionName: string, listener: (value: string) => void): void;
```

Registers a callback that can be invoked from the host page via
`window.__kurotCallback(functionName, value)`.
