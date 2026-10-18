# open

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
open(url: string, method: HttpMethod): void;
```

Prepare an asynchronous request URL and method (GET by default). Aborts any
active request and discards previously queued headers. Does not send until
send(); native URL/header/send errors may throw synchronously at that step.

**Default method:** `HttpMethod.GET`

Related types: [HttpMethod](../HttpMethod-typealias.md).
