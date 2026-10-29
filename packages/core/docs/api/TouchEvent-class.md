# TouchEvent

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
class TouchEvent extends Event
```

Canvas pointer event expressed in logical stage and target-local units.
Use stageX/stageY for stage-level game controls; CSS pixels are not the
same coordinate system when the stage is scaled.

Related types: [Event](Event-class.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](TouchEvent-class/constructor-constructor.md) |
| `data` | public, inherited | [open](TouchEvent-class/data-property.md) |
| `touchDown` | public | [open](TouchEvent-class/touchDown-property.md) |
| `touchPointID` | public | [open](TouchEvent-class/touchPointID-property.md) |
| `static ACTIVATE` | public, inherited | [open](TouchEvent-class/static-ACTIVATE-property.md) |
| `static ADDED` | public, inherited | [open](TouchEvent-class/static-ADDED-property.md) |
| `static ADDED_TO_STAGE` | public, inherited | [open](TouchEvent-class/static-ADDED_TO_STAGE-property.md) |
| `static CHANGE` | public, inherited | [open](TouchEvent-class/static-CHANGE-property.md) |
| `static CHANGING` | public, inherited | [open](TouchEvent-class/static-CHANGING-property.md) |
| `static CLOSE` | public, inherited | [open](TouchEvent-class/static-CLOSE-property.md) |
| `static COMPLETE` | public, inherited | [open](TouchEvent-class/static-COMPLETE-property.md) |
| `static CONNECT` | public, inherited | [open](TouchEvent-class/static-CONNECT-property.md) |
| `static DEACTIVATE` | public, inherited | [open](TouchEvent-class/static-DEACTIVATE-property.md) |
| `static ENDED` | public, inherited | [open](TouchEvent-class/static-ENDED-property.md) |
| `static ENTER_FRAME` | public, inherited | [open](TouchEvent-class/static-ENTER_FRAME-property.md) |
| `static FOCUS_IN` | public, inherited | [open](TouchEvent-class/static-FOCUS_IN-property.md) |
| `static FOCUS_OUT` | public, inherited | [open](TouchEvent-class/static-FOCUS_OUT-property.md) |
| `static LEAVE_STAGE` | public, inherited | [open](TouchEvent-class/static-LEAVE_STAGE-property.md) |
| `static LOOP_COMPLETE` | public, inherited | [open](TouchEvent-class/static-LOOP_COMPLETE-property.md) |
| `static REMOVED` | public, inherited | [open](TouchEvent-class/static-REMOVED-property.md) |
| `static REMOVED_FROM_STAGE` | public, inherited | [open](TouchEvent-class/static-REMOVED_FROM_STAGE-property.md) |
| `static RENDER` | public, inherited | [open](TouchEvent-class/static-RENDER-property.md) |
| `static RESIZE` | public, inherited | [open](TouchEvent-class/static-RESIZE-property.md) |
| `static SOUND_COMPLETE` | public, inherited | [open](TouchEvent-class/static-SOUND_COMPLETE-property.md) |
| `static TOUCH_BEGIN` | public | [open](TouchEvent-class/static-TOUCH_BEGIN-property.md) |
| `static TOUCH_CANCEL` | public | [open](TouchEvent-class/static-TOUCH_CANCEL-property.md) |
| `static TOUCH_END` | public | [open](TouchEvent-class/static-TOUCH_END-property.md) |
| `static TOUCH_MOVE` | public | [open](TouchEvent-class/static-TOUCH_MOVE-property.md) |
| `static TOUCH_RELEASE_OUTSIDE` | public | [open](TouchEvent-class/static-TOUCH_RELEASE_OUTSIDE-property.md) |
| `static TOUCH_TAP` | public | [open](TouchEvent-class/static-TOUCH_TAP-property.md) |
| `bubbles` | public, inherited | [open](TouchEvent-class/bubbles-accessor.md) |
| `cancelable` | public, inherited | [open](TouchEvent-class/cancelable-accessor.md) |
| `currentTarget` | public, inherited | [open](TouchEvent-class/currentTarget-accessor.md) |
| `eventPhase` | public, inherited | [open](TouchEvent-class/eventPhase-accessor.md) |
| `isPropagationImmediateStopped` | public, inherited | [open](TouchEvent-class/isPropagationImmediateStopped-accessor.md) |
| `isPropagationStopped` | public, inherited | [open](TouchEvent-class/isPropagationStopped-accessor.md) |
| `localX` | public | [open](TouchEvent-class/localX-accessor.md) |
| `localY` | public | [open](TouchEvent-class/localY-accessor.md) |
| `stageX` | public | [open](TouchEvent-class/stageX-accessor.md) |
| `stageY` | public | [open](TouchEvent-class/stageY-accessor.md) |
| `target` | public, inherited | [open](TouchEvent-class/target-accessor.md) |
| `type` | public, inherited | [open](TouchEvent-class/type-accessor.md) |
| `clean` | protected, inherited | [open](TouchEvent-class/clean-method.md) |
| `initTo` | public | [open](TouchEvent-class/initTo-method.md) |
| `isDefaultPrevented` | public, inherited | [open](TouchEvent-class/isDefaultPrevented-method.md) |
| `preventDefault` | public, inherited | [open](TouchEvent-class/preventDefault-method.md) |
| `resetForPool` | public, inherited | [open](TouchEvent-class/resetForPool-method.md) |
| `setCurrentTarget` | public, inherited | [open](TouchEvent-class/setCurrentTarget-method.md) |
| `setDispatchContext` | public | [open](TouchEvent-class/setDispatchContext-method.md) |
| `stopImmediatePropagation` | public, inherited | [open](TouchEvent-class/stopImmediatePropagation-method.md) |
| `stopPropagation` | public, inherited | [open](TouchEvent-class/stopPropagation-method.md) |
| `updateAfterEvent` | public | [open](TouchEvent-class/updateAfterEvent-method.md) |
| `static create` | public, inherited | [open](TouchEvent-class/static-create-method.md) |
| `static dispatch` | public, inherited | [open](TouchEvent-class/static-dispatch-method.md) |
| `static dispatchTouchEvent` | public | [open](TouchEvent-class/static-dispatchTouchEvent-method.md) |
| `static release` | public, inherited | [open](TouchEvent-class/static-release-method.md) |
