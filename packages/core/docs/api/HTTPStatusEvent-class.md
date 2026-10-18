# HTTPStatusEvent

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
class HTTPStatusEvent extends Event
```

Mutable event with capture/target/bubble context and cancellation flags.
Events created through the pool may be reused after dispatch/release; copy
needed values rather than retaining a pooled event object.

Related types: [Event](Event-class.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](HTTPStatusEvent-class/constructor-constructor.md) |
| `data` | public, inherited | [open](HTTPStatusEvent-class/data-property.md) |
| `static ACTIVATE` | public, inherited | [open](HTTPStatusEvent-class/static-ACTIVATE-property.md) |
| `static ADDED` | public, inherited | [open](HTTPStatusEvent-class/static-ADDED-property.md) |
| `static ADDED_TO_STAGE` | public, inherited | [open](HTTPStatusEvent-class/static-ADDED_TO_STAGE-property.md) |
| `static CHANGE` | public, inherited | [open](HTTPStatusEvent-class/static-CHANGE-property.md) |
| `static CHANGING` | public, inherited | [open](HTTPStatusEvent-class/static-CHANGING-property.md) |
| `static CLOSE` | public, inherited | [open](HTTPStatusEvent-class/static-CLOSE-property.md) |
| `static COMPLETE` | public, inherited | [open](HTTPStatusEvent-class/static-COMPLETE-property.md) |
| `static CONNECT` | public, inherited | [open](HTTPStatusEvent-class/static-CONNECT-property.md) |
| `static DEACTIVATE` | public, inherited | [open](HTTPStatusEvent-class/static-DEACTIVATE-property.md) |
| `static ENDED` | public, inherited | [open](HTTPStatusEvent-class/static-ENDED-property.md) |
| `static ENTER_FRAME` | public, inherited | [open](HTTPStatusEvent-class/static-ENTER_FRAME-property.md) |
| `static FOCUS_IN` | public, inherited | [open](HTTPStatusEvent-class/static-FOCUS_IN-property.md) |
| `static FOCUS_OUT` | public, inherited | [open](HTTPStatusEvent-class/static-FOCUS_OUT-property.md) |
| `static HTTP_STATUS` | public | [open](HTTPStatusEvent-class/static-HTTP_STATUS-property.md) |
| `static LEAVE_STAGE` | public, inherited | [open](HTTPStatusEvent-class/static-LEAVE_STAGE-property.md) |
| `static LOOP_COMPLETE` | public, inherited | [open](HTTPStatusEvent-class/static-LOOP_COMPLETE-property.md) |
| `static REMOVED` | public, inherited | [open](HTTPStatusEvent-class/static-REMOVED-property.md) |
| `static REMOVED_FROM_STAGE` | public, inherited | [open](HTTPStatusEvent-class/static-REMOVED_FROM_STAGE-property.md) |
| `static RENDER` | public, inherited | [open](HTTPStatusEvent-class/static-RENDER-property.md) |
| `static RESIZE` | public, inherited | [open](HTTPStatusEvent-class/static-RESIZE-property.md) |
| `static SOUND_COMPLETE` | public, inherited | [open](HTTPStatusEvent-class/static-SOUND_COMPLETE-property.md) |
| `bubbles` | public, inherited | [open](HTTPStatusEvent-class/bubbles-accessor.md) |
| `cancelable` | public, inherited | [open](HTTPStatusEvent-class/cancelable-accessor.md) |
| `currentTarget` | public, inherited | [open](HTTPStatusEvent-class/currentTarget-accessor.md) |
| `eventPhase` | public, inherited | [open](HTTPStatusEvent-class/eventPhase-accessor.md) |
| `isPropagationImmediateStopped` | public, inherited | [open](HTTPStatusEvent-class/isPropagationImmediateStopped-accessor.md) |
| `isPropagationStopped` | public, inherited | [open](HTTPStatusEvent-class/isPropagationStopped-accessor.md) |
| `status` | public | [open](HTTPStatusEvent-class/status-accessor.md) |
| `target` | public, inherited | [open](HTTPStatusEvent-class/target-accessor.md) |
| `type` | public, inherited | [open](HTTPStatusEvent-class/type-accessor.md) |
| `clean` | protected, inherited | [open](HTTPStatusEvent-class/clean-method.md) |
| `isDefaultPrevented` | public, inherited | [open](HTTPStatusEvent-class/isDefaultPrevented-method.md) |
| `preventDefault` | public, inherited | [open](HTTPStatusEvent-class/preventDefault-method.md) |
| `resetForPool` | public, inherited | [open](HTTPStatusEvent-class/resetForPool-method.md) |
| `setCurrentTarget` | public, inherited | [open](HTTPStatusEvent-class/setCurrentTarget-method.md) |
| `setDispatchContext` | public, inherited | [open](HTTPStatusEvent-class/setDispatchContext-method.md) |
| `stopImmediatePropagation` | public, inherited | [open](HTTPStatusEvent-class/stopImmediatePropagation-method.md) |
| `stopPropagation` | public, inherited | [open](HTTPStatusEvent-class/stopPropagation-method.md) |
| `static create` | public, inherited | [open](HTTPStatusEvent-class/static-create-method.md) |
| `static dispatch` | public, inherited | [open](HTTPStatusEvent-class/static-dispatch-method.md) |
| `static dispatchHTTPStatusEvent` | public | [open](HTTPStatusEvent-class/static-dispatchHTTPStatusEvent-method.md) |
| `static release` | public, inherited | [open](HTTPStatusEvent-class/static-release-method.md) |
