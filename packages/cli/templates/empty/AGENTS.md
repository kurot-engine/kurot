# Game project agent entry

Read [README.md](README.md) for commands, expected startup and project paths.
For a complete game flow, follow its game-authoring/Star Catcher route when available.
Use package.json, the lock and `pnpm list --depth 0` for the actual SDK baseline.

- Start gameplay changes in `src/Main.ts` or the modules it imports. This is a
  Core-only consumer project; engine internals are outside its normal scope.
- Read installed Core's README first. For the API being changed, consult its
  public `dist/index.d.ts`/re-exported types and the relevant installed guide.
  When available, `docs/api/topics.md` routes to individual symbol/member pages.
  The README links resources, audio and CLI usage; load other docs on demand.
  When an older install lacks a guide, use its README/types before versioned
  source. Engine-repository source paths may be absent from node_modules.
- Use TypeScript, ESM and the project's strict settings. Use named exports,
  explicit exported-function return types and `undefined` for missing values.
  Use the installed public API and preserve the project's dependency baseline.
- Keep one Player. Display/input coordinates are logical units. Retain listener
  and tick callback identities so application cleanup can unregister them.
  `app.stop()` stops this Player's rendering; manage gameplay activity separately.
- Edit source/config/resource inputs; output directories and `.kurot/` are
  generated. Read the authored HTML path from kurot.config.ts.
- Before finishing, run `pnpm build` and check the browser console and intended
  behavior. Run `pnpm release` when changing release behavior. Report executed
  checks and any unverified behavior; build success alone is not gameplay proof.
