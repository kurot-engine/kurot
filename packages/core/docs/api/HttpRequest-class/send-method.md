# send

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
send(data?: string | ArrayBuffer | FormData): void;
```

Send after open() and optional setRequestHeader(). COMPLETE reports a successful
load; IO_ERROR reports network failure, timeout, status 0 or HTTP status >=400.
A native load first emits HTTP_STATUS, including error status codes. Native
setup/send errors can throw synchronously; register event handlers before calling.
Call open() for each new request; repeated send() alone does not abort a prior
native request. Abort owned work and remove listeners when the view closes.
