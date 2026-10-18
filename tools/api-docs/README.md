# Kurot API documentation tooling

Private build-time tooling for Core, Game and UI. Consumers read the generated
files shipped in each SDK's `docs/api/`; they do not install this tool or copy
the engine repository. No model evaluation is involved.

## Commands

Use pnpm 10.33.0. Install this tool's exact lock and each SDK's existing lock;
build Core, Game and UI before validating examples or packages. Existing SDK
dependency ranges, installations and locks are not changed by generation.

```sh
pnpm --dir tools/api-docs install --frozen-lockfile
pnpm --dir packages/core build
pnpm --dir packages/game build
pnpm --dir packages/ui build
pnpm --dir tools/api-docs build
pnpm --dir tools/api-docs generate
pnpm --dir tools/api-docs verify
```

Run from the repository root. In this checkout, the pnpm executable is
`/Users/kelvin/Library/pnpm/.tools/pnpm/10.33.0/bin/pnpm`; other machines should
use their own pnpm 10.33.0 installation.

- `generate` regenerates only the three `docs/api/` trees.
- `check` regenerates in memory and rejects missing exports/members, broken
  API links, stale content, unexpected leftover files and new comment gaps.
- `test` exercises inheritance, aliases, singleton/object members, overloads,
  accessors, dropped pages, stale files, broken links and example extraction.
- `check:examples` strictly compiles every extracted TypeScript JSDoc fence
  against built public declarations, without inventing ambient variables.
- `check:package` packs locally with lifecycle scripts disabled and no network,
  extracts into a fresh consumer, checks all API files/version metadata and
  compiles the packed examples against packed declarations. No engine `src/`
  directory is included. It prints the temporary evidence directory.
- `html` generates the Markdown reference plus an optional versioned HTML site
  in the gitignored `site/` directory. It does not deploy or publish it.

## Authoring and coverage

Public declarations and source JSDoc are authoritative. Write contracts next
to their declarations: units, default/undefined behavior, failure paths,
ownership, order and cleanup. Examples are complete TypeScript modules. Their
extracted copies and declaration pages are generated, not separately authored.

API identity comes from each package manifest. Core references are resolved
against the current checkout Core when generating Game/UI documentation;
dependency ranges and application locks keep their independent meanings.
Inherited member pages show the receiver's substituted generic types. Some
inherited behavior still depends on the Core version actually installed.

TypeDoc 0.28.14 and TypeScript 5.9.3 are exact private dependencies. TypeDoc
converts signatures/comments; an independent TypeScript export inventory
checks every public root name and public/protected member. Private,
`@internal`/`@hidden`, `$`-prefixed and `_`-prefixed members are outside the
application contract. Protected hooks are explicitly labeled. Supporting types
are documented without implying that their names are package-root imports.

`coverage.json` separates missing references from entries lacking behavioral
JSDoc. Zero missing references is mandatory. `comment-baseline.json` records
existing comment gaps explicitly; it is not a claim that those contracts have
all been reviewed or fully explained. New gaps fail the check. Prefer writing
JSDoc; exceptions to the baseline require deliberate review. Remove resolved
entries from the baseline when improving a previously missing comment so a
later removal cannot silently regress it.

## Loading only relevant documentation

Start at the installed SDK's `docs/api/topics.md`. Read one capability list,
then the needed symbol and member pages. `api-index.json` maps names to paths;
`supporting/index.md` routes to parameter/result helper definitions. Type
declarations remain the fallback for older releases that lack generated docs.

The generated Markdown is committed and covered by existing `docs/**/*` package
allowlists. Core 2.5.5, Game 2.0.1 and UI 3.6.1 are published with their API files,
verified on 2026-10-18. Later documentation edits need a new release to appear
in npm; existing published archives are immutable.

UI 3.6.2 contains a regenerated version-matched API reference and the standard
UI authoring/ScoreHUD guides; its reported publication remains unconfirmed on
public npm. CLI 3.6.1 is published and verified with template entry documentation
and corrected host declarations. Engine dependency ranges/locks are unchanged;
Kurot-Studio separately adopts CLI 3.6.1. See the [publication record](../../docs/release-history.md).
