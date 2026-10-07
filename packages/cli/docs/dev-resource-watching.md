# Development resource watching

Available in published CLI 3.3.1. No configuration or
dependency-range changes are required. Projects must install the new CLI to
receive these behaviors; installed CLI 3.3.0 does not include them.

## Inputs and rebuilds

`kurot dev` watches the entire `resource/` subtree regardless of whether `ui` is
enabled. Runtime files do not need an extension allowlist or a special atlas
directory. This includes JSON configurations, PNG/JPEG/WebP, fonts, audio,
translations and other project-owned files.

| Input change | Action |
| --- | --- |
| KUI source, default.res.json or config/style.json in a UI project | Compile KUI and synchronize runtime assets |
| Runtime JSON, including config/locale.json and sheet JSON | Synchronize assets |
| PNG, fonts, language properties and other runtime files | Synchronize assets |
| Resource directory creation, replacement or deletion | Reconnect watcher and reconcile output; compile KUI when enabled |
| Reusable component source or skin | Retain component discovery/namespace/catalog rebuild and synchronize assets |

Changes to `kurot.config.ts`, dependencies or build configuration still require
restarting dev. Locale configuration is consumed by project code; the CLI does
not introduce a locale parser or mutate authored skins. A style edit may change
compiled skin assignments while its XML remains untouched.

The resource watcher uses recursive `fs.watch` on the resource directory plus a
shallow parent watcher, so it can reconnect when a missing root is created or an
existing root is replaced. It does not recursively watch dependencies or build
output. Native recursive watch support is required; setup failures are logged.

## Batches and synchronization

Events are debounced for 100 ms. A batch retains its need for KUI compilation even
when a later event concerns only a runtime resource. Resource updates and
component rebuilds share a serialized queue. Failed KUI batches are retried on
subsequent resource edits before any resource synchronization can succeed.

Synchronization scans source assets, compares SHA-256 content hashes and writes
only changed files. It stages every changed file on the output filesystem before
publishing. Each changed file is renamed into place; source-owned deleted files
and empty parent directories are removed. Directory renames and file/directory
replacements are reconciled. Generated theme files, compiled bundles and catalogs
are not treated as source-owned assets. Identical contents are not rewritten.

Source renames during a scan are retried at most twice after an initial ENOENT
failure. Other errors are reported through a failed build-complete event; dev
stays running for the next edit. A failed scan leaves staged bytes unpublished.
Publication itself can fail after some files have been renamed: this is not a
rollback transaction.

A resource-only batch emits JSONL build-start with reason `resource-change`,
followed by build-complete after synchronization. Existing `kui-change` and
`source-change` reasons retain their meaning. Consumers should tolerate the
additional reason and refresh only after a successful build-complete event.

## Preview and atlas boundaries

Browser refresh remains manual. Successful HTTP responses use
`Cache-Control: no-store`, so a reloaded preview requests current output files.
The CLI does not invalidate resources inside a running game's Core cache.
Reskin's existing reload-preview button can load synchronized assets without
restarting the dev process.

Atlas PNG and JSON can be saved together and handled in the same debounce batch.
The CLI copies bytes; it does not parse or validate atlas geometry, discover
source images, pack atlases or require an atlas dependency. It does not infer
when an external packer has finished a job.

**Debouncing and per-file atomic renames are not an atomic PNG/JSON transaction.**
Files saved farther apart can produce separate successful batches, and a request
during publication can observe different generations. For now, save both files
before refreshing. A tool requiring strict cross-process group consistency needs
a separate commit notification/version protocol; that is outside this change.

Every resource batch currently scans and hashes the complete source asset tree,
reading one file at a time and staging changed files on disk. This avoids retaining
all decoded assets in memory and avoids rewriting unchanged output, but scan I/O
still grows with total resource size. Path-based scan caches can be evaluated
separately for large projects.

## Verification

`test/resource-watch.test.ts` starts actual CLI processes and verifies HTTP bytes,
cache headers, runtime-only updates without changed skin output, atlas atomic-save
events, locale/properties/fonts, rename/deletion, Core-only root creation/recreation,
mixed style/runtime changes, failure retention and recovery. Existing CLI KUI,
manifest, component and Label preset watch tests cover their respective rebuilds.
