# load

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
load(request: URLRequest): void;
```

Start loading from the specified URL.
Closes the previous request first. JSON parse and network failures dispatch
IO_ERROR; await an event rather than this void-returning method. Progress
is available for HTTP text/binary/JSON, not image or sound loader paths.

Related types: [URLRequest](../URLRequest-class.md).
