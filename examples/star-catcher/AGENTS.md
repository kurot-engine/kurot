# Star Catcher game task entry

Read README.md for controls, verification and the task-to-file map; read only
the source modules involved in the change. The linked Core game-authoring guide
summarizes public APIs, logical coordinates, clock and cleanup contracts.

- Preserve the exact SDK/tool versions and existing lock unless dependency
  adoption is explicitly requested. Source signatures come from installed Core.
- Keep gameplay rules in GameModel, input ownership in GameInput, round lifetime
  in GameSession, visuals in GameView and page lifetime in Main.
- Use logical pixels and elapsed seconds in gameplay; the ticker provides a
  timestamp in milliseconds. Reset the clock on resume and cap long updates.
- On restart, dispose the previous session before making a new one. Close and
  pagehide must release input, tick/stage/DOM listeners and the app. Stop the
  shared ticker only at final teardown because this page owns every consumer.
- Run pnpm check for gameplay/lifecycle changes. Browser tests validate both
  development and release output; report actual outcomes and verification gaps.
