# Development resource watching

`kurot dev` synchronizes runtime assets without additional watcher configuration.
Browser refresh remains manual.

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
| Root kurot.config.ts or .js stage defaults | Validate and atomically regenerate HTML; refresh manually |

With CLI >= 3.8.0 within 3.x, stage defaults in `kurot.config.ts` / `.js` can be
saved without restarting `kurot dev`. `kurot build --watch` retains its existing
source-watch behavior and does not install the configuration watcher.
After the successful configuration update, refresh the browser manually. The
new Player consumes HTML canvas attributes with the Core behavior described in
[stage configuration](../../core/docs/stage-configuration.md), requiring Core
>= 2.6.0 within 2.x; explicit runtime options still take priority.

The watcher handles ordinary and atomic editor saves of the root ESM config file,
re-evaluates it with a fresh module URL, validates width/height, scale mode,
orientation and frame rate, and atomically replaces only the generated HTML.
Invalid edits keep the last successful page, report an error and allow correction
without restarting. Imported configuration helpers and dependencies are not
reloaded; edits to them still require restarting dev.

Changes outside `stage`, including entry/output/UI paths, or dependencies still
require restarting dev. A detected structural config change reports
`KUROT_CONFIG_RESTART_REQUIRED` and leaves the active outputs intact. Locale configuration is consumed by project code; the CLI does
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
Root configuration updates emit `config-change`; failures additionally emit
`KUROT_CONFIG_RELOAD_FAILED` or `KUROT_CONFIG_RESTART_REQUIRED` diagnostics.
The stage watcher shares this serialized queue with resource/component work.

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
