# URLLoaderEvents

Supporting declaration from `@kurot/game`, reachable through the public API.
This page does not imply that the name is importable from the package root.
Use the owning API parameter/result type or an exported public alias when writing application code.

```ts
export interface URLLoaderEvents extends EventMap {
    [Event.COMPLETE]: Event;
    [IOErrorEvent.IO_ERROR]: IOErrorEvent;
    [ProgressEvent.PROGRESS]: ProgressEvent;
}
```

Related declarations: [EventMap](../../../../core/docs/api/EventMap-typealias.md), [Event](../../../../core/docs/api/Event-class.md), [IOErrorEvent](../../../../core/docs/api/IOErrorEvent-class.md), [ProgressEvent](../../../../core/docs/api/ProgressEvent-class.md).
