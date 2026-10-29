# setRequestHeader

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
setRequestHeader(header: string, value: string): void;
```

Queue a request header to be sent with the next `send()` call.

Must be called after `open()` and before `send()` because the underlying
XMLHttpRequest is created lazily by `send()`.
