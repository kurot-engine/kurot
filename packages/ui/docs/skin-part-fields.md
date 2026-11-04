# Skin part fields

UI 4 binds named Skin parts directly to their host Component. Author the object
in KUI XML, declare its type in TypeScript, and use the field after skin readiness.
CLI 4 checks statically associated skins against those declarations.

```xml
<Skin xmlns="https://kurot.dev/ui/1" class="views.AlertPanelSkin">
  <Button id="btnClose" />
  <Label id="lblMessage" />
</Skin>
```

```ts
import { Component } from '@kurot/ui';
import type { Button, Label } from '@kurot/ui';

export class AlertPanel extends Component<'views.AlertPanelSkin'> {
  declare btnClose: Button;
  declare lblMessage: Label;

  public updateMessage(message: string): void {
    this.lblMessage.text = message;
  }
}
```

A Presenter uses `panel.btnClose`. A view-specific animation helper can receive
the concrete panel and access its fields directly. No extra part-name list,
decorator, copying hook or wrapper object is needed.

## Source of truth

`Skin.skinParts` supplies the runtime names and `Skin.getPart(name)` supplies the
objects. `declare` is erased and supplies only TypeScript information. Programmatic
skins and CLI-built skins use the same Component binding path.

Only nodes with an explicit ID become named parts. Internal visual nodes can
omit IDs. The host's read-only `skinParts` accessor remains available for framework
or diagnostic enumeration; ordinary view, Presenter and behavior code uses fields.

## Declaration rules

- Use `declare btnClose: Button` for a required part, or
  `declare optionalHint?: Label` for a part absent from some skin variants.
- Put shared part declarations on the application base view. Derived classes
  inherit them; every statically associated skin must satisfy required parts.
- Initialize ordinary business state normally. CLI treats new `declare` fields
  on associated views as skin declarations, excluding inherited non-part type
  refinements such as a renderer's `data` property.
- Plain emitted fields and initializers with a part's name are rejected by CLI.
  In ES2022, initialization after `super()` can overwrite a skin installed by a
  base constructor. `declare` avoids that write regardless of class-field settings.
- Declaration types must accept the authored node type. A Label part cannot
  satisfy a Button declaration. CLI checks known variants and installed SDK types.

CLI finds configured component/Skin pairs, literal skinName assignments, literal
generic skin names and unique ClassNameSkin conventions. Runtime-provided skins
outside that static set remain the application's contract; runtime validation
still checks host-member collisions and native slot types.

## Lifecycle and ownership

1. Component resolves the candidate and validates its complete part set.
2. `onSkinRemoved()` runs with all old fields and the old part map available.
3. Old state, Watchers and visuals detach; owned field references are cleared.
4. New fields and visuals attach, the skin becomes ready, and `onSkinReady()` runs.
5. Component invalidates layout and dispatches COMPLETE.

Use parts inside `onSkinReady()` and later ready-view callbacks. Keep initialization
that needs them out of constructors. Before first binding or after skin clearing,
required declarations do not make runtime fields available. Replacing a skin
updates the fields; a subsequent skin omitting a part removes its old reference.

Removing the host from the stage retains its skin and fields for reuse. Closing
a scene still requires its own cleanup for model/stage listeners, timers, tweens
and asynchronous work. Skin-part listeners belong in `onSkinRemoved()`.

The binder clears only references it installed that still point to the old part.
An application-reassigned field is preserved. Reusing that name in a later skin
is a conflict until the application releases it. Empty pre-existing data fields
are restored to their original descriptor. Borrowed textures/fonts/resources are
not disposed by field cleanup.

## Native slots and conflicts

Standard controls explicitly register their native part validators. Fields such
as Button.labelDisplay accept their declared node types. Accessors such as
Slider.thumb/track retain their setters so touch listeners and drag cleanup work.
Native declarations carry `@skinPart` metadata for CLI validation. Application
views need only their ordinary `declare` fields.

Methods, arbitrary accessors, initialized business fields, constructor/prototype
names and names beginning with `_` or `$` cannot be overwritten by authored parts.
Non-writable targets are rejected. Native registration is the controlled exception
for a control's actual part slots, not permission to invoke arbitrary setters.

Naming/type preflight failures leave the attached skin and its fields intact and
do not commit a new skinName. Cleanup hooks must not claim a new skin's part names
for business state; such changes are rechecked before installation. Exceptions
from application hooks or setters propagate and do not roll back their external
side effects.
