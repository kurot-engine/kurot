# getCurrentState

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
protected getCurrentState(): string;
```

Extension hook: protected; available to subclasses.

Inherited from `getCurrentState`; shown with this receiver's substituted types.

Return the current view state, layering the selected state on top of
the base up/down/disabled states.

Matches egret `ToggleButton.getCurrentState` (L132-145): if the skin
does not export an `AndSelected` variant, the state falls back to `down`
(or `disabled`) instead of returning a skin-missing state name that
would leave the button visually blank.
