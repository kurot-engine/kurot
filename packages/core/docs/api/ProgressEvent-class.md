# ProgressEvent

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
class ProgressEvent extends Event
```

Mutable event with capture/target/bubble context and cancellation flags.
Events created through the pool may be reused after dispatch/release; copy
needed values rather than retaining a pooled event object.

Related types: [Event](Event-class.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](ProgressEvent-class/constructor-constructor.md) |
| `bytesLoaded` | public | [open](ProgressEvent-class/bytesLoaded-property.md) |
| `bytesTotal` | public | [open](ProgressEvent-class/bytesTotal-property.md) |
| `data` | public, inherited | [open](ProgressEvent-class/data-property.md) |
| `static ACTIVATE` | public, inherited | [open](ProgressEvent-class/static-ACTIVATE-property.md) |
| `static ADDED` | public, inherited | [open](ProgressEvent-class/static-ADDED-property.md) |
| `static ADDED_TO_STAGE` | public, inherited | [open](ProgressEvent-class/static-ADDED_TO_STAGE-property.md) |
| `static CHANGE` | public, inherited | [open](ProgressEvent-class/static-CHANGE-property.md) |
| `static CHANGING` | public, inherited | [open](ProgressEvent-class/static-CHANGING-property.md) |
| `static CLOSE` | public, inherited | [open](ProgressEvent-class/static-CLOSE-property.md) |
| `static COMPLETE` | public, inherited | [open](ProgressEvent-class/static-COMPLETE-property.md) |
| `static CONNECT` | public, inherited | [open](ProgressEvent-class/static-CONNECT-property.md) |
| `static DEACTIVATE` | public, inherited | [open](ProgressEvent-class/static-DEACTIVATE-property.md) |
| `static ENDED` | public, inherited | [open](ProgressEvent-class/static-ENDED-property.md) |
| `static ENTER_FRAME` | public, inherited | [open](ProgressEvent-class/static-ENTER_FRAME-property.md) |
| `static FOCUS_IN` | public, inherited | [open](ProgressEvent-class/static-FOCUS_IN-property.md) |
| `static FOCUS_OUT` | public, inherited | [open](ProgressEvent-class/static-FOCUS_OUT-property.md) |
| `static LEAVE_STAGE` | public, inherited | [open](ProgressEvent-class/static-LEAVE_STAGE-property.md) |
| `static LOOP_COMPLETE` | public, inherited | [open](ProgressEvent-class/static-LOOP_COMPLETE-property.md) |
| `static PROGRESS` | public | [open](ProgressEvent-class/static-PROGRESS-property.md) |
| `static REMOVED` | public, inherited | [open](ProgressEvent-class/static-REMOVED-property.md) |
| `static REMOVED_FROM_STAGE` | public, inherited | [open](ProgressEvent-class/static-REMOVED_FROM_STAGE-property.md) |
| `static RENDER` | public, inherited | [open](ProgressEvent-class/static-RENDER-property.md) |
| `static RESIZE` | public, inherited | [open](ProgressEvent-class/static-RESIZE-property.md) |
| `static SOCKET_DATA` | public | [open](ProgressEvent-class/static-SOCKET_DATA-property.md) |
| `static SOUND_COMPLETE` | public, inherited | [open](ProgressEvent-class/static-SOUND_COMPLETE-property.md) |
| `bubbles` | public, inherited | [open](ProgressEvent-class/bubbles-accessor.md) |
| `cancelable` | public, inherited | [open](ProgressEvent-class/cancelable-accessor.md) |
| `currentTarget` | public, inherited | [open](ProgressEvent-class/currentTarget-accessor.md) |
| `eventPhase` | public, inherited | [open](ProgressEvent-class/eventPhase-accessor.md) |
| `isPropagationImmediateStopped` | public, inherited | [open](ProgressEvent-class/isPropagationImmediateStopped-accessor.md) |
| `isPropagationStopped` | public, inherited | [open](ProgressEvent-class/isPropagationStopped-accessor.md) |
| `target` | public, inherited | [open](ProgressEvent-class/target-accessor.md) |
| `type` | public, inherited | [open](ProgressEvent-class/type-accessor.md) |
| `clean` | protected, inherited | [open](ProgressEvent-class/clean-method.md) |
| `isDefaultPrevented` | public, inherited | [open](ProgressEvent-class/isDefaultPrevented-method.md) |
| `preventDefault` | public, inherited | [open](ProgressEvent-class/preventDefault-method.md) |
| `resetForPool` | public, inherited | [open](ProgressEvent-class/resetForPool-method.md) |
| `setCurrentTarget` | public, inherited | [open](ProgressEvent-class/setCurrentTarget-method.md) |
| `setDispatchContext` | public, inherited | [open](ProgressEvent-class/setDispatchContext-method.md) |
| `stopImmediatePropagation` | public, inherited | [open](ProgressEvent-class/stopImmediatePropagation-method.md) |
| `stopPropagation` | public, inherited | [open](ProgressEvent-class/stopPropagation-method.md) |
| `static create` | public, inherited | [open](ProgressEvent-class/static-create-method.md) |
| `static dispatch` | public, inherited | [open](ProgressEvent-class/static-dispatch-method.md) |
| `static dispatchProgressEvent` | public | [open](ProgressEvent-class/static-dispatchProgressEvent-method.md) |
| `static release` | public, inherited | [open](ProgressEvent-class/static-release-method.md) |
