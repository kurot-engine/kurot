# HttpRequest

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
class HttpRequest extends EventDispatcher<HttpRequestEvents>
```

Event-driven XMLHttpRequest wrapper.

Use the lifecycle `open()` → `setRequestHeader()` → `send()`. One instance
may be reused by calling `open()` for each new request; doing so aborts the
previous request and clears headers queued for it.

Related types: [EventDispatcher](EventDispatcher-class.md), [HttpRequestEvents](HttpRequestEvents-interface.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public, inherited | [open](HttpRequest-class/constructor-constructor.md) |
| `responseType` | public | [open](HttpRequest-class/responseType-property.md) |
| `timeout` | public | [open](HttpRequest-class/timeout-property.md) |
| `withCredentials` | public | [open](HttpRequest-class/withCredentials-property.md) |
| `response` | public | [open](HttpRequest-class/response-accessor.md) |
| `status` | public | [open](HttpRequest-class/status-accessor.md) |
| `abort` | public | [open](HttpRequest-class/abort-method.md) |
| `addEventListener` | public, inherited | [open](HttpRequest-class/addEventListener-method.md) |
| `dispatchEvent` | public, inherited | [open](HttpRequest-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](HttpRequest-class/dispatchEventWith-method.md) |
| `getAllResponseHeaders` | public | [open](HttpRequest-class/getAllResponseHeaders-method.md) |
| `getResponseHeader` | public | [open](HttpRequest-class/getResponseHeader-method.md) |
| `hasEventListener` | public, inherited | [open](HttpRequest-class/hasEventListener-method.md) |
| `notifyListener` | protected, inherited | [open](HttpRequest-class/notifyListener-method.md) |
| `once` | public, inherited | [open](HttpRequest-class/once-method.md) |
| `open` | public | [open](HttpRequest-class/open-method.md) |
| `removeEventListener` | public, inherited | [open](HttpRequest-class/removeEventListener-method.md) |
| `send` | public | [open](HttpRequest-class/send-method.md) |
| `setRequestHeader` | public | [open](HttpRequest-class/setRequestHeader-method.md) |
| `willTrigger` | public, inherited | [open](HttpRequest-class/willTrigger-method.md) |
