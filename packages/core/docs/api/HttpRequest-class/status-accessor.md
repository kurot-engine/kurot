# status

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
get status(): number;
```

HTTP status code from the active or most recently completed request.
Returns 0 before completion, after abort(), or when the browser blocks the
request before a response is available (for example, a failed CORS check).
