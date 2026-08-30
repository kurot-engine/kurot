# @kurot/ui-runtime — AI context map

Package identity: `@kurot/ui-runtime@0.3.0`. This package consumes validated
`UIDocument` data and creates real Kurot display objects for browser execution
and editor preview.

It depends on `@kurot/ui-document`, `@kurot/ui`, and `@kurot/core`. It does not
own component behavior, rendering, document schemas, or Stage lifecycle.

Source root: `src/kurot/runtime/`. Public API: `src/index.ts`.

## Public API

- `createKurotUI(document, options)` validates and materializes one complete
  document. It returns the root, instance and controller maps, root data
  controller, and a listener disposer rather than owning a Stage.
- `CreateKurotUIOptions.registry` replaces the foundation semantic registry;
  extend a foundation registry when custom and built-in types coexist.
- `CreateKurotUIOptions.assets` supplies the complete project asset, resource,
  and design-token registry. It is required when the root references assets.
- `CreateKurotUIOptions.adapters` maps project component keys to construction,
  property, and child-attachment hooks.
- `CreateKurotUIOptions.data` supplies initial values for root Contract fields.
- `CreateKurotUIOptions.onAction` receives declared semantic actions.
- `CreateKurotUIOptions.resourceAdapters` maps each registered resource
  category to runtime values; every default returns the stable resource key.
- `KurotUIRuntimeError` exposes a stable `code`, exact semantic `path`, and any
  document validation `diagnostics`.

## Built-in boundary

The audited built-in types are `kui.Group`, `kui.Label`, `kui.EditableText`,
`kui.Image`, `kui.Rect`, `kui.Button`, `kui.ToggleButton`, `kui.ProgressBar`,
and `kui.TextInput`. Layout descriptors accept `kui.BasicLayout`,
`kui.HorizontalLayout`,
`kui.VerticalLayout`, and `kui.TileLayout`. Rectangle descriptors are converted
to `@kurot/core` `Rectangle` instances.

Property names are applied in sorted order and children retain document order.
Unknown or malformed runtime values fail instead of being assigned dynamically.
The runtime does not fill in component Schema defaults; Kurot constructors own
their runtime defaults.

`kui.ToggleButton` uses its real constructor default of `toggle = true`.
`kui.ProgressBar` accepts `minimum`, `maximum`, `value`, `direction`, and
`slideDuration`; its `thumb` and `labelDisplay` appearance parts remain owned by
the native component behavior.

`kui.TextInput` remains the application-facing control. Its appearance may use
`kui.EditableText` as the native `textDisplay` part and `kui.Label` as
`promptDisplay`. Authored TextInput values are applied before its appearance,
then forwarded by the real control when those parts bind. Input type is
currently restricted to plain `text` by the shared Schema and runtime.

Reusable component internals are materialized under slash-qualified identities,
for example `play-action/label`. Parameters apply through declared bindings,
then instance overrides apply as the most specific values. Slot children retain
their owning document scope. Appearance internals use an `@appearance:` scope
and are installed as a native `Skin`; declared states become `State` and
`SetProperty` objects. A selected appearance variant is applied to the
materialized skin tree before native states are installed.

Reusable component Contracts with states receive one `KurotUIStateController`
per expanded instance. `setState(name)` applies overrides atomically and
`clearState()` restores the pre-state values. Appearance states continue to use
native Kurot `Skin` state handling. Numeric state overrides may declare bounded
duration, delay, and easing transitions.

Every materialized asset scope receives a `KurotUIDataController`. Declared
one-way bindings are applied in stable name order, and invalid updates fail with
`invalid-data`. Root initial values come from `CreateKurotUIOptions.data`;
reusable component scopes currently begin from Contract defaults. Declared
`tap` and `change` actions are forwarded through `onAction`; `dispose()` removes
the listeners owned by the materialization.

`Image.source` is forwarded to the existing `@kurot/ui` resource mechanism.
Appearance assets are materialized as native `Skin` instances and assigned by
the runtime; `skinName` is not an authored component property. The package does
not invent resource or Theme lookup. An unskinned `Button` therefore exists and
behaves as a component but has no automatic visual appearance.

Resource resolution dispatches by exact category: image, sprite-frame, font,
Spine, or animation. The built-in defaults preserve the registered key. Spine
and animation rendering still require project component adapters; this package
does not depend on a particular animation or Spine implementation.

## Task lookup

- Component creation: `src/kurot/runtime/builtins/componentFactories.ts`
- Project validation and orchestration: `src/kurot/runtime/createKurotUI.ts`
- Recursive tree construction: `src/kurot/runtime/materializeNode.ts`
- Component reuse: `src/kurot/runtime/materializeComponentInstance.ts`
- Appearances and states: `src/kurot/runtime/materializeAppearance.ts`
- Reusable component states: `src/kurot/runtime/states/`
- Contract data and semantic actions: `src/kurot/runtime/dynamics/`
- Appearance transitions: `src/kurot/runtime/transitions/`
- Resource-category adapters: `src/kurot/runtime/resources/`
- Token and resource resolution: `src/kurot/runtime/resolvePropertyValue.ts`
- Runtime property orchestration: `src/kurot/runtime/applyRuntimeProperty.ts`
- Built-in property routing: `src/kurot/runtime/builtins/applyBuiltInProperties.ts`
- DisplayObject properties: `src/kurot/runtime/builtins/applyDisplayObjectProperties.ts`
- UIComponent properties: `src/kurot/runtime/builtins/applyUIComponentProperties.ts`
- Component properties: `src/kurot/runtime/builtins/applyComponentProperties.ts`
- Group properties: `src/kurot/runtime/builtins/applyGroupProperties.ts`
- Label properties: `src/kurot/runtime/builtins/applyLabelProperties.ts`
- EditableText properties: `src/kurot/runtime/builtins/applyEditableTextProperties.ts`
- TextInput properties: `src/kurot/runtime/builtins/applyTextInputProperties.ts`
- Image properties: `src/kurot/runtime/builtins/applyImageProperties.ts`
- Rect properties: `src/kurot/runtime/builtins/applyRectProperties.ts`
- Button properties: `src/kurot/runtime/builtins/applyButtonProperties.ts`
- ProgressBar properties: `src/kurot/runtime/builtins/applyProgressBarProperties.ts`
- Layout descriptors: `src/kurot/runtime/descriptors/createLayout.ts`
- Rectangle descriptors: `src/kurot/runtime/descriptors/createRectangle.ts`
- Custom adapter contracts: `src/kurot/runtime/types.ts`
- Browser smoke preview: `examples/preview/`
- Runtime tests: `test/`, including the representative Phase 3 Crash screen

## Commands

```sh
pnpm --dir packages/ui-runtime install
pnpm --dir packages/ui-runtime build
pnpm --dir packages/ui-runtime test
pnpm --dir packages/ui-runtime preview
```
