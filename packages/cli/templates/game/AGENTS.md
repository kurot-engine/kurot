# Game project agent entry

Read [README.md](README.md) for commands, project paths and installed-doc links.
For a complete game flow, follow its game-authoring/Star Catcher route when available.
Check package.json, the lock and `pnpm list --depth 0` for the actual SDK baseline.

- Start gameplay in `src/Main.ts` or its application modules. Consult startup
  services only when changing fonts, resources, translations or lifecycle.
  Preserve the startup order documented in README.
- For UI, follow README's installed UI authoring/ScoreHUD route (UI >= 3.6.2). Pair discovered component
  TS and Skin XML at matching relative paths; keep helpers outside the scanned
  components directory. Edit appearance in XML and game decisions in controllers.
- Read the relevant installed Core/Game/UI/CLI README and public declarations
  before adding APIs. When installed, `docs/api/topics.md` routes to individual
  symbol/member pages; read only those needed. Published Game 2.0.0 has no
  docs/; use its README/types, then versioned source if needed. Source paths in
  engine context maps may be absent from installed packages.
- Use TypeScript, ESM and strict settings, named exports, explicit exported
  function return types and `undefined` for missing values. Use public APIs
  from the installed versions; keep dependency adoption explicit.
- Keep one Player and use logical display/input coordinates. Manage cleanup
  for gameplay ticks, listeners, timers, tweens and sound channels on restart
  and exit. `app.stop()` stops rendering; it does not pause all gameplay work.
- Edit source, KUI XML, manifests and project configuration. Build outputs,
  generated theme JSON and `.kurot/` declarations come from those inputs.
- Finish with `pnpm build`, `pnpm exec tsc --noEmit --skipLibCheck false`
  (CLI >= 3.6.1) and browser checks for startup, resources and changed
  interactions. Check restart/cleanup when affected and `pnpm release` for
  release changes. Report checks actually run and remaining verification limits;
  esbuild success alone is not type checking or proof of playability.
