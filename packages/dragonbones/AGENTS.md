# @kurot/dragonbones — package instructions

Read the repository root `AGENTS.md`, this package's `docs/ai-context.md`, and
`../../docs/code-rules.md` before editing. This package is maintained in
`Kurot/packages/dragonbones`; version 0.1.0 is published to npm.

Own code follows the root TypeScript / ESM / ES2022 / strict rules. The local
`.prettierrc` preserves the Templates/tentax formatting requested for this port.
The only runtime peer dependency is `@kurot/core ^2.1.1`.
Development declares Core ^2.2.0 and the lockfile currently resolves published
2.2.0 without local overrides. Compatible development updates need no adapter
release when shipped output is unchanged. Keep the peer minimum at 2.1.1 unless
an adapter change requires a newer Core API; see the
[independent release policy](../../docs/dependency-policy.md).

`src/runtime` contains maintained TypeScript source adapted from the pinned
official DragonBones runtime, not generated JS or declarations. The one-time
port replaces namespaces with ESM imports/exports, removes legacy environment
bootstrap, and adds definite-assignment assertions for pool-initialized fields
and override modifiers. Keep animation/geometry/parse behavior explicit when
editing. Existing upstream any/null contracts are retained as imported code;
new adapter code follows the root strict/undefined rules. Large imported files
are not mechanically split or bulk-formatted. `upstream.json` records the
original source commit and hashes for provenance, not current-source equality.
Runtime attributes exclude inherited whitespace from diff checks.

Only `dist` contains generated JS and declarations; do not edit those outputs.
Run `pnpm build`, `pnpm typecheck`, `pnpm test`, and `pnpm format` in this package.
There is no root workspace install/build command. After changes, run the
relevant checks and root `git diff --check`.

Project resource verification reads the supplied external assets; do not copy
game images or modify the Egret reference or Templates/tentax. Game migration
remains paused while this package is developed.
