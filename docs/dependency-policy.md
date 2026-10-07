# Dependencies and independent releases

Kurot packages have independent versions. A dependency release is a reason to
check affected consumers, not an instruction to bump every consumer version.
Refreshing a development lockfile is maintenance; publishing a changed runtime
or a changed compatibility requirement is a release.

## Package graph

Arrows point from a consumer to its dependency. Solid arrows are ordinary
dependencies; dashed arrows are peer compatibility requirements.

```mermaid
flowchart LR
    core["@kurot/core"] --> font["@kurot/bitmap-font"]
    ui["@kurot/ui"] -. peer .-> core
    game["@kurot/game"] -. peer .-> core
    dragonbones["@kurot/dragonbones"] -. peer .-> core
    runtime["@kurot/ui-runtime"] -. peer .-> core
    runtime -. peer .-> ui
    runtime -. peer .-> document["@kurot/ui-document"]
    cli["@kurot/cli: build time"] --> document
    atlas["@kurot/atlas: independent build tool"]
```

The manifests are authoritative. Current Kurot package requirements are:

| Package | Ordinary Kurot dependency | Kurot peers | Purpose |
| --- | --- | --- | --- |
| core | bitmap-font `^0.1.0` | None | Headless font parsing and layout used by native rendering. |
| ui | None | core `^2.2.0` | Components use the application's Core objects. |
| game | None | core `^2.0.0` | Game helpers use the application's Core objects and ticker. |
| dragonbones | None | core `^2.1.1` | Animation displays and meshes use the application's Core. |
| ui-runtime | None | core `^2.1.0`, ui `^3.1.0`, ui-document `^0.11.0` | Materializes a document into the application's Core/UI objects. |
| cli | ui-document `^0.11.0` | None | Compiles KUI at build time. |
| ui-document | None | None | Headless authoring, validation and serialization. |
| bitmap-font | None | None | Headless font data, validation and layout. |
| atlas | None | None | Independent pixel packing with a Node PNG subpath. |

Third-party tools are separate from this graph. Core's linebreak package is a
runtime dependency; Atlas's PNG adapter uses pngjs. TypeScript, Vitest, esbuild
used by tests, and browser test tools are development dependencies. The CLI's
esbuild is a dependency of the build tool, not a game runtime dependency.

Core does not depend on UI, Game, ui-runtime, DragonBones or Atlas. UI does not
depend directly on bitmap-font. CLI-built skins do not require ui-runtime.
Editor can combine font and atlas editing while their headless packages remain
independent; a shared editor does not require a shared runtime package.

Keep Core/UI as peers where consumers exchange native objects. Verify that an
application resolves a compatible shared Core instance; a peer declaration
alone does not prove that its installed dependency tree has no duplicate engine.

## Three different version concerns

| Field or file | Meaning | When to change it |
| --- | --- | --- |
| `dependencies` | Code or data contract consumed by the package. | When adopting an API or behavior that requires a newer minimum, or migrating to an incompatible line. |
| `peerDependencies` | Supported host versions, starting at the real minimum requirement. | When the consumer starts requiring a new API/contract, changes supported host lines, or corrects invalid metadata. |
| `devDependencies` | Versions allowed for building and testing this checkout. | When deliberately changing the development/test baseline. |
| `pnpm-lock.yaml` / `bun.lock` | Exact versions installed for this checkout/application. | When deliberately adopting an update; keep frozen installs for reproduction. |
| Package `version` | Identity of a published artifact. | When publishing changed shipped behavior, API, types, compatibility or other requested release content. |

Use compatible ranges for SDK dependencies and peers, with a lower bound based
on what the package actually needs. Never copy the latest Core version into
every peer minimum. Development ranges can be newer than peer minima; their
lockfiles record the version actually tested. Keep the promised minimum in
compatibility validation when changing code that might depend on newer APIs.

Updating only development declarations or lockfiles does not require an SDK
version bump or an npm publication. A development update that changes generated
or bundled shipped output must be assessed as an artifact change instead.
Do not republish an existing name/version with different contents.

Applications own their upgrade schedule. Exact dependencies are acceptable for
desktop products; ranges plus committed lockfiles are acceptable for projects.
To deliver a dependency fix inside a bundled application, update its dependency
tree, rebuild and follow that application's version/release rules. This does not
require publishing new versions of unchanged SDK packages.

## Release impact rules

| Change | Release scope | Consumer adoption |
| --- | --- | --- |
| Compatible fix to an externally resolved dependency | Release the package containing the fix. | Consumers whose ranges accept it may update their installations/lockfiles. Unchanged SDKs keep their versions and peer minima. |
| New optional API or feature | Release the package adding it. | Release only consumers that implement/adopt it, with accurate minimum requirements. Other consumers stay on their existing contracts. |
| Removed/changed API or incompatible data contract | Release the breaking package on the appropriate incompatible version line. | Migrate and release affected consumers; expand support only after validating each claimed line. |
| Incorrect peer metadata | Release the package with corrected metadata. | Verify compatibility rather than masking the conflict with a permanent override. |
| Development/test baseline refresh | No SDK release when shipped output and compatibility remain unchanged. | Update the chosen package's development installation and run its checks. |
| Compatible dependency update embedded in a published bundle | Rebuild the package or application that embeds it; version it if publishing changed output. | Treat each changed artifact separately; externally resolved consumers still need no blanket version bump. |

For a dependency change, classify each direct consumer as one of:

1. **Required migration to adopt the target:** its declared range excludes the
   target, or its code, generated output or data contract must change. A consumer
   can stay on a supported existing version when adoption is not required.
2. **Optional adoption:** the range accepts the target and the installed/locked
   version is older. Adopt the fix when useful; this is not a release obligation.
3. **Unaffected:** no relevant dependency or already using the required behavior.

Propagate the analysis to downstream consumers only when the direct consumer's
shipped behavior or compatibility changes. Do not turn the dependency graph into
an automatic sequence of package version bumps.

## Current release examples

- Core 2.2.1 fixes TextField wrapping. UI 3.2.0, Game 2.0.0, ui-runtime 0.8.2
  and DragonBones 0.1.0 already accept it. Those SDKs need no new publication.
  A project can adopt Core 2.2.1 and rebuild using their existing releases.
- UI 3.2.0 adds BitmapLabel, which uses Core's 2.2.0 bitmap-font rendering.
  Its Core peer minimum is `^2.2.0`, including applications that do not use
  BitmapLabel. Consumers that stay on UI 3.1 keep that release's Core contract.
- A bitmap-font 0.1.x fix can resolve through Core's existing `^0.1.0` range.
  Core needs a new release only if its shipped artifact or dependency contract
  changes. Moving to bitmap-font 0.2.x requires an explicit adoption decision.
- ui-document 0.11.0 adds Label presets. CLI and ui-runtime releases that adopt
  those APIs need the matching kernel; unrelated Core, Game and DragonBones
  releases are not part of that feature's release scope.
- Earlier Spine 4.0–4.2 adapter 0.2.0 and 4.3 adapter 0.3.0 declare Core
  `^1.0.16`, excluding Core 2.x. Published 0.2.1 / 0.3.1 validate both engine
  lines and expand the peer to `^1.0.16 || ^2.0.0`; npm publication was verified
  on 2026-10-08. That compatibility metadata change required adapter releases.
  Existing application caret ranges accept them. It does not trigger new
  Core/UI/Game releases.

## Headless packages before 1.0

Caret ranges for 0.x stay within the current nonzero minor: `^0.11.0` accepts
0.11.x, not 0.12.x; `^0.1.0` accepts 0.1.x, not 0.2.x. An unchanged JSON format
version alone does not prove compatible exported types, defaults or validation.
Do not use an unrestricted 0.x range to hide that distinction.

Once a headless package's public contracts are stable, prepare a deliberate 1.0
release. Subsequent compatible additions can then use a 1.x minor release
without forcing consumers to adopt a new incompatible range. Such stabilization
is a separate release decision; this policy does not bump current packages.

## Targeted update workflow

When adopting a compatible dependency in a development checkout, preserve the
supported ranges and update only the selected dependency. For example:

```sh
pnpm --dir packages/ui update @kurot/core --no-save
pnpm --dir packages/ui build
pnpm --dir packages/ui test
git diff --check
```

Review the resulting manifest and lockfile diff, including transitive and peer
resolution. Do not use a repository-wide `--latest` update as a release step.
The repo still has no root pnpm workspace; applications using Bun keep their
own installation and release workflow. CLI templates' `latest` dependencies
select versions for newly created projects; existing projects keep their locks.

For a new release, build/test the changed package first. Run relevant direct
consumer checks when an API, type, data, resource or rendering contract changed.
Use packed/registry integration where object identity or generated/bundled code
is involved. Record the tested versions without raising unrelated peer minima.

References: [npm dependency fields](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/),
[npm caret ranges](https://github.com/npm/node-semver#caret-ranges-123-025-004),
[targeted pnpm updates](https://pnpm.io/cli/update).
