# StageOrientationEvent

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
class StageOrientationEvent extends Event
```

Mutable event with capture/target/bubble context and cancellation flags.
Events created through the pool may be reused after dispatch/release; copy
needed values rather than retaining a pooled event object.

Related types: [Event](Event-class.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](StageOrientationEvent-class/constructor-constructor.md) |
| `data` | public, inherited | [open](StageOrientationEvent-class/data-property.md) |
| `static ACTIVATE` | public, inherited | [open](StageOrientationEvent-class/static-ACTIVATE-property.md) |
| `static ADDED` | public, inherited | [open](StageOrientationEvent-class/static-ADDED-property.md) |
| `static ADDED_TO_STAGE` | public, inherited | [open](StageOrientationEvent-class/static-ADDED_TO_STAGE-property.md) |
| `static CHANGE` | public, inherited | [open](StageOrientationEvent-class/static-CHANGE-property.md) |
| `static CHANGING` | public, inherited | [open](StageOrientationEvent-class/static-CHANGING-property.md) |
| `static CLOSE` | public, inherited | [open](StageOrientationEvent-class/static-CLOSE-property.md) |
| `static COMPLETE` | public, inherited | [open](StageOrientationEvent-class/static-COMPLETE-property.md) |
| `static CONNECT` | public, inherited | [open](StageOrientationEvent-class/static-CONNECT-property.md) |
| `static DEACTIVATE` | public, inherited | [open](StageOrientationEvent-class/static-DEACTIVATE-property.md) |
| `static ENDED` | public, inherited | [open](StageOrientationEvent-class/static-ENDED-property.md) |
| `static ENTER_FRAME` | public, inherited | [open](StageOrientationEvent-class/static-ENTER_FRAME-property.md) |
| `static FOCUS_IN` | public, inherited | [open](StageOrientationEvent-class/static-FOCUS_IN-property.md) |
| `static FOCUS_OUT` | public, inherited | [open](StageOrientationEvent-class/static-FOCUS_OUT-property.md) |
| `static LEAVE_STAGE` | public, inherited | [open](StageOrientationEvent-class/static-LEAVE_STAGE-property.md) |
| `static LOOP_COMPLETE` | public, inherited | [open](StageOrientationEvent-class/static-LOOP_COMPLETE-property.md) |
| `static ORIENTATION_CHANGE` | public | [open](StageOrientationEvent-class/static-ORIENTATION_CHANGE-property.md) |
| `static REMOVED` | public, inherited | [open](StageOrientationEvent-class/static-REMOVED-property.md) |
| `static REMOVED_FROM_STAGE` | public, inherited | [open](StageOrientationEvent-class/static-REMOVED_FROM_STAGE-property.md) |
| `static RENDER` | public, inherited | [open](StageOrientationEvent-class/static-RENDER-property.md) |
| `static RESIZE` | public, inherited | [open](StageOrientationEvent-class/static-RESIZE-property.md) |
| `static SOUND_COMPLETE` | public, inherited | [open](StageOrientationEvent-class/static-SOUND_COMPLETE-property.md) |
| `bubbles` | public, inherited | [open](StageOrientationEvent-class/bubbles-accessor.md) |
| `cancelable` | public, inherited | [open](StageOrientationEvent-class/cancelable-accessor.md) |
| `currentTarget` | public, inherited | [open](StageOrientationEvent-class/currentTarget-accessor.md) |
| `eventPhase` | public, inherited | [open](StageOrientationEvent-class/eventPhase-accessor.md) |
| `isPropagationImmediateStopped` | public, inherited | [open](StageOrientationEvent-class/isPropagationImmediateStopped-accessor.md) |
| `isPropagationStopped` | public, inherited | [open](StageOrientationEvent-class/isPropagationStopped-accessor.md) |
| `target` | public, inherited | [open](StageOrientationEvent-class/target-accessor.md) |
| `type` | public, inherited | [open](StageOrientationEvent-class/type-accessor.md) |
| `clean` | protected, inherited | [open](StageOrientationEvent-class/clean-method.md) |
| `isDefaultPrevented` | public, inherited | [open](StageOrientationEvent-class/isDefaultPrevented-method.md) |
| `preventDefault` | public, inherited | [open](StageOrientationEvent-class/preventDefault-method.md) |
| `resetForPool` | public, inherited | [open](StageOrientationEvent-class/resetForPool-method.md) |
| `setCurrentTarget` | public, inherited | [open](StageOrientationEvent-class/setCurrentTarget-method.md) |
| `setDispatchContext` | public, inherited | [open](StageOrientationEvent-class/setDispatchContext-method.md) |
| `stopImmediatePropagation` | public, inherited | [open](StageOrientationEvent-class/stopImmediatePropagation-method.md) |
| `stopPropagation` | public, inherited | [open](StageOrientationEvent-class/stopPropagation-method.md) |
| `static create` | public, inherited | [open](StageOrientationEvent-class/static-create-method.md) |
| `static dispatch` | public, inherited | [open](StageOrientationEvent-class/static-dispatch-method.md) |
| `static dispatchStageOrientationEvent` | public | [open](StageOrientationEvent-class/static-dispatchStageOrientationEvent-method.md) |
| `static release` | public, inherited | [open](StageOrientationEvent-class/static-release-method.md) |
