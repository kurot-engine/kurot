# IOErrorEvent

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
class IOErrorEvent extends Event
```

Mutable event with capture/target/bubble context and cancellation flags.
Events created through the pool may be reused after dispatch/release; copy
needed values rather than retaining a pooled event object.

Related types: [Event](Event-class.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](IOErrorEvent-class/constructor-constructor.md) |
| `data` | public, inherited | [open](IOErrorEvent-class/data-property.md) |
| `static ACTIVATE` | public, inherited | [open](IOErrorEvent-class/static-ACTIVATE-property.md) |
| `static ADDED` | public, inherited | [open](IOErrorEvent-class/static-ADDED-property.md) |
| `static ADDED_TO_STAGE` | public, inherited | [open](IOErrorEvent-class/static-ADDED_TO_STAGE-property.md) |
| `static CHANGE` | public, inherited | [open](IOErrorEvent-class/static-CHANGE-property.md) |
| `static CHANGING` | public, inherited | [open](IOErrorEvent-class/static-CHANGING-property.md) |
| `static CLOSE` | public, inherited | [open](IOErrorEvent-class/static-CLOSE-property.md) |
| `static COMPLETE` | public, inherited | [open](IOErrorEvent-class/static-COMPLETE-property.md) |
| `static CONNECT` | public, inherited | [open](IOErrorEvent-class/static-CONNECT-property.md) |
| `static DEACTIVATE` | public, inherited | [open](IOErrorEvent-class/static-DEACTIVATE-property.md) |
| `static ENDED` | public, inherited | [open](IOErrorEvent-class/static-ENDED-property.md) |
| `static ENTER_FRAME` | public, inherited | [open](IOErrorEvent-class/static-ENTER_FRAME-property.md) |
| `static FOCUS_IN` | public, inherited | [open](IOErrorEvent-class/static-FOCUS_IN-property.md) |
| `static FOCUS_OUT` | public, inherited | [open](IOErrorEvent-class/static-FOCUS_OUT-property.md) |
| `static IO_ERROR` | public | [open](IOErrorEvent-class/static-IO_ERROR-property.md) |
| `static LEAVE_STAGE` | public, inherited | [open](IOErrorEvent-class/static-LEAVE_STAGE-property.md) |
| `static LOOP_COMPLETE` | public, inherited | [open](IOErrorEvent-class/static-LOOP_COMPLETE-property.md) |
| `static REMOVED` | public, inherited | [open](IOErrorEvent-class/static-REMOVED-property.md) |
| `static REMOVED_FROM_STAGE` | public, inherited | [open](IOErrorEvent-class/static-REMOVED_FROM_STAGE-property.md) |
| `static RENDER` | public, inherited | [open](IOErrorEvent-class/static-RENDER-property.md) |
| `static RESIZE` | public, inherited | [open](IOErrorEvent-class/static-RESIZE-property.md) |
| `static SOUND_COMPLETE` | public, inherited | [open](IOErrorEvent-class/static-SOUND_COMPLETE-property.md) |
| `bubbles` | public, inherited | [open](IOErrorEvent-class/bubbles-accessor.md) |
| `cancelable` | public, inherited | [open](IOErrorEvent-class/cancelable-accessor.md) |
| `currentTarget` | public, inherited | [open](IOErrorEvent-class/currentTarget-accessor.md) |
| `eventPhase` | public, inherited | [open](IOErrorEvent-class/eventPhase-accessor.md) |
| `isPropagationImmediateStopped` | public, inherited | [open](IOErrorEvent-class/isPropagationImmediateStopped-accessor.md) |
| `isPropagationStopped` | public, inherited | [open](IOErrorEvent-class/isPropagationStopped-accessor.md) |
| `target` | public, inherited | [open](IOErrorEvent-class/target-accessor.md) |
| `type` | public, inherited | [open](IOErrorEvent-class/type-accessor.md) |
| `clean` | protected, inherited | [open](IOErrorEvent-class/clean-method.md) |
| `isDefaultPrevented` | public, inherited | [open](IOErrorEvent-class/isDefaultPrevented-method.md) |
| `preventDefault` | public, inherited | [open](IOErrorEvent-class/preventDefault-method.md) |
| `resetForPool` | public, inherited | [open](IOErrorEvent-class/resetForPool-method.md) |
| `setCurrentTarget` | public, inherited | [open](IOErrorEvent-class/setCurrentTarget-method.md) |
| `setDispatchContext` | public, inherited | [open](IOErrorEvent-class/setDispatchContext-method.md) |
| `stopImmediatePropagation` | public, inherited | [open](IOErrorEvent-class/stopImmediatePropagation-method.md) |
| `stopPropagation` | public, inherited | [open](IOErrorEvent-class/stopPropagation-method.md) |
| `static create` | public, inherited | [open](IOErrorEvent-class/static-create-method.md) |
| `static dispatch` | public, inherited | [open](IOErrorEvent-class/static-dispatch-method.md) |
| `static dispatchIOErrorEvent` | public | [open](IOErrorEvent-class/static-dispatchIOErrorEvent-method.md) |
| `static release` | public, inherited | [open](IOErrorEvent-class/static-release-method.md) |
