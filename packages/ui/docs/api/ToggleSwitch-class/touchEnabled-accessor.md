# touchEnabled

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
get touchEnabled(): boolean;
set touchEnabled(value: boolean);
```

Inherited from `touchEnabled`; shown with this receiver's substituted types.

Whether the display object receives touch events.

Unlike the setter, reading this property always returns the *actual*
display-level value — even when the component is disabled (the setter
deliberately preserves `_explicitTouchEnabled` for the next `enabled`
restore, so the getter must bypass that layer).

Whether this node can be selected as a touch target; copied from
DisplayObject.defaultTouchEnabled (false initially). This does not control
touchable descendants; containers expose touchChildren separately.
