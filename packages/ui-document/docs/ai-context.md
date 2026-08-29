# @kurot/ui-document — AI context map

Read this before exploring `src/`. The source and `src/index.ts` remain the
authority for current behavior and public exports.

Package identity: `@kurot/ui-document@0.1.0`. This is a headless, runtime-
independent semantic document package for future Kurot UI editing workflows.
It currently has no runtime dependencies.

## Current state

The package is an initial scaffold. Its only public API is
`UI_DOCUMENT_FORMAT_VERSION` from `src/version.ts`. A document schema,
commands, history, validation, serialization, migrations, and EXML adapters
are intended responsibilities, but they are not implemented or public APIs
yet.

Do not infer a document structure from Egret EXML, Unity UXML, FairyGUI, or
other editor formats. Add schema concepts only when their Kurot contracts and
tests are defined.

## Package boundary

- Owns pure, serializable UI semantics and deterministic transformations.
- Must remain independent of `@kurot/core` and `@kurot/ui` runtime classes.
- Must not perform filesystem, network, DOM, canvas, or WebGL operations.
- Must not contain visual editor panels or model-provider integration.
- Format adapters translate at the boundary; external formats do not define
  the internal document model.

## Directory map

```text
src/
├── index.ts       Public export barrel.
└── version.ts     Semantic document format version.

test/
└── version.test.ts
```

## Commands

```sh
pnpm --dir packages/ui-document install
pnpm --dir packages/ui-document build
pnpm --dir packages/ui-document test
```
