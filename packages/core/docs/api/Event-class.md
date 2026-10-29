# Event

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
class Event
```

Mutable event with capture/target/bubble context and cancellation flags.
Events created through the pool may be reused after dispatch/release; copy
needed values rather than retaining a pooled event object.

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](Event-class/constructor-constructor.md) |
| `data` | public | [open](Event-class/data-property.md) |
| `static ACTIVATE` | public | [open](Event-class/static-ACTIVATE-property.md) |
| `static ADDED` | public | [open](Event-class/static-ADDED-property.md) |
| `static ADDED_TO_STAGE` | public | [open](Event-class/static-ADDED_TO_STAGE-property.md) |
| `static CHANGE` | public | [open](Event-class/static-CHANGE-property.md) |
| `static CHANGING` | public | [open](Event-class/static-CHANGING-property.md) |
| `static CLOSE` | public | [open](Event-class/static-CLOSE-property.md) |
| `static COMPLETE` | public | [open](Event-class/static-COMPLETE-property.md) |
| `static CONNECT` | public | [open](Event-class/static-CONNECT-property.md) |
| `static DEACTIVATE` | public | [open](Event-class/static-DEACTIVATE-property.md) |
| `static ENDED` | public | [open](Event-class/static-ENDED-property.md) |
| `static ENTER_FRAME` | public | [open](Event-class/static-ENTER_FRAME-property.md) |
| `static FOCUS_IN` | public | [open](Event-class/static-FOCUS_IN-property.md) |
| `static FOCUS_OUT` | public | [open](Event-class/static-FOCUS_OUT-property.md) |
| `static LEAVE_STAGE` | public | [open](Event-class/static-LEAVE_STAGE-property.md) |
| `static LOOP_COMPLETE` | public | [open](Event-class/static-LOOP_COMPLETE-property.md) |
| `static REMOVED` | public | [open](Event-class/static-REMOVED-property.md) |
| `static REMOVED_FROM_STAGE` | public | [open](Event-class/static-REMOVED_FROM_STAGE-property.md) |
| `static RENDER` | public | [open](Event-class/static-RENDER-property.md) |
| `static RESIZE` | public | [open](Event-class/static-RESIZE-property.md) |
| `static SOUND_COMPLETE` | public | [open](Event-class/static-SOUND_COMPLETE-property.md) |
| `bubbles` | public | [open](Event-class/bubbles-accessor.md) |
| `cancelable` | public | [open](Event-class/cancelable-accessor.md) |
| `currentTarget` | public | [open](Event-class/currentTarget-accessor.md) |
| `eventPhase` | public | [open](Event-class/eventPhase-accessor.md) |
| `isPropagationImmediateStopped` | public | [open](Event-class/isPropagationImmediateStopped-accessor.md) |
| `isPropagationStopped` | public | [open](Event-class/isPropagationStopped-accessor.md) |
| `target` | public | [open](Event-class/target-accessor.md) |
| `type` | public | [open](Event-class/type-accessor.md) |
| `clean` | protected | [open](Event-class/clean-method.md) |
| `isDefaultPrevented` | public | [open](Event-class/isDefaultPrevented-method.md) |
| `preventDefault` | public | [open](Event-class/preventDefault-method.md) |
| `resetForPool` | public | [open](Event-class/resetForPool-method.md) |
| `setCurrentTarget` | public | [open](Event-class/setCurrentTarget-method.md) |
| `setDispatchContext` | public | [open](Event-class/setDispatchContext-method.md) |
| `stopImmediatePropagation` | public | [open](Event-class/stopImmediatePropagation-method.md) |
| `stopPropagation` | public | [open](Event-class/stopPropagation-method.md) |
| `static create` | public | [open](Event-class/static-create-method.md) |
| `static dispatch` | public | [open](Event-class/static-dispatch-method.md) |
| `static release` | public | [open](Event-class/static-release-method.md) |
