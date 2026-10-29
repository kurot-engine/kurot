# ResourceLoader

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
class ResourceLoader
```

Queue-based resource loader with concurrency control.

- Items are processed in priority order (higher priority first).
- Concurrency is limited to `threadCount` (default 2).
- Failed items are retried up to `retryCount` times (default 3).
- Progress is reported via the `onProgress` callback.

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](ResourceLoader-class/constructor-constructor.md) |
| `onComplete` | public | [open](ResourceLoader-class/onComplete-property.md) |
| `onError` | public | [open](ResourceLoader-class/onError-property.md) |
| `onProgress` | public | [open](ResourceLoader-class/onProgress-property.md) |
| `retryCount` | public | [open](ResourceLoader-class/retryCount-property.md) |
| `threadCount` | public | [open](ResourceLoader-class/threadCount-property.md) |
| `abort` | public | [open](ResourceLoader-class/abort-method.md) |
| `loadResourceList` | public | [open](ResourceLoader-class/loadResourceList-method.md) |
| `registerAnalyzer` | public | [open](ResourceLoader-class/registerAnalyzer-method.md) |
| `start` | public | [open](ResourceLoader-class/start-method.md) |
