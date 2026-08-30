# @kurot/ui-runtime — AI context map

Package identity: `@kurot/ui-runtime@0.1.0`. This package consumes validated
`UIDocument` data and creates real Kurot display objects for browser execution
and editor preview.

It depends on `@kurot/ui-document`, `@kurot/ui`, and `@kurot/core`. It does not
own component behavior, rendering, document schemas, or Stage lifecycle.

Source root: `src/kurot/runtime/`. Public API: `src/index.ts`.

## Public API

- `createKurotUI(document, options)` validates and materializes one complete
  document. It returns `{ root, instances }` rather than owning a Stage.
- `CreateKurotUIOptions.registry` replaces the foundation semantic registry;
  extend a foundation registry when custom and built-in types coexist.
- `CreateKurotUIOptions.adapters` maps project component keys to construction,
  property, and child-attachment hooks.
- `KurotUIRuntimeError` exposes a stable `code`, exact semantic `path`, and any
  document validation `diagnostics`.

## Built-in boundary

The audited built-in types are `kui.Group`, `kui.Label`, `kui.Image`,
`kui.Rect`, and `kui.Button`. Layout descriptors accept `kui.BasicLayout`,
`kui.HorizontalLayout`, `kui.VerticalLayout`, and `kui.TileLayout`. Rectangle
descriptors are converted to `@kurot/core` `Rectangle` instances.

Property names are applied in sorted order and children retain document order.
Unknown or malformed runtime values fail instead of being assigned dynamically.
The runtime does not fill in Schema defaults; Kurot component constructors own
their runtime defaults.

`Image.source` and `Component.skinName` are forwarded to the existing
`@kurot/ui` mechanisms. The package does not invent resource or Theme lookup.
An unskinned `Button` therefore exists and behaves as a component but has no
automatic visual appearance.

## Task lookup

- Component creation: `src/kurot/runtime/builtins/componentFactories.ts`
- Recursive tree construction: `src/kurot/runtime/createKurotUI.ts`
- Common/runtime properties: `src/kurot/runtime/builtins/applyDisplayProperties.ts`
- Component property routing: `src/kurot/runtime/builtins/applyComponentProperties.ts`
- Container properties: `src/kurot/runtime/builtins/applyContainerProperties.ts`
- Text properties: `src/kurot/runtime/builtins/applyTextProperties.ts`
- Interactive control properties: `src/kurot/runtime/builtins/applyControlProperties.ts`
- Layout descriptors: `src/kurot/runtime/descriptors/createLayout.ts`
- Rectangle descriptors: `src/kurot/runtime/descriptors/createRectangle.ts`
- Custom adapter contracts: `src/kurot/runtime/types.ts`
- Browser smoke preview: `examples/preview/`
- Runtime tests: `test/createKurotUI.test.ts`

## Commands

```sh
pnpm --dir packages/ui-runtime install
pnpm --dir packages/ui-runtime build
pnpm --dir packages/ui-runtime test
pnpm --dir packages/ui-runtime preview
```
