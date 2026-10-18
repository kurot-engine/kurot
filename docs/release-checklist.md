# Package version and release checklist

When the user asks to bump or prepare a package version, the task includes all
of the following unless the user explicitly narrows the scope:

1. Read [root AGENTS.md](../AGENTS.md) before editing the package, then read the target
   package's `docs/ai-context.md` and relevant package documentation.
2. Update the version in the target package's `package.json`.
3. Add a dated release entry to the package's `CHANGELOG.md` describing the
   actual user-visible, internal, and breaking changes as applicable.
4. Update the package's `README.md` in the same change. At minimum, audit and
   correct its displayed version, API examples, lifecycle guidance, migration
   notes, and compatibility requirements; do not leave stale documentation.
5. Re-check root `AGENTS.md`. Update the package version table and any
   dependency or architectural guidance affected by the release.
6. Find direct package dependants and classify required compatibility migrations,
   optional installed/development lockfile adoption, and unaffected consumers.
   Report peer, development, template, example and application requirements.
   Compatible older locks are not a reason to bump dependent SDK versions.
   Follow [dependency policy](dependency-policy.md); do not silently bump unrelated packages.
7. Run the target package's build and tests, then run `git diff --check`. Report
   the exact verification result before declaring the release ready.

Preparing source changes does not establish publication. When publication is
authorized, record registry version/tag, downloaded artifact and integrity
verification separately from the source version.

For a documentation/publication status sync, check README opening banners,
package identity blocks, architecture headers and active compatibility guides
against the manifest and exact registry/latest metadata. Update current
cross-package requirements from the real peer ranges; preserve feature-introduction
minimums, dated validation snapshots and accepted older application/development
locks. Keep the [published snapshot](release-history.md) current and distinguish
repository documentation updates from immutable published package contents.
