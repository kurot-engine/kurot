# Standard game UI authoring

Use this workflow for ordinary game HUDs, menus, dialogs and lists. It uses
native `@kurot/ui`, CLI-compiled Skin XML and project TypeScript. It requires
no engine source and no `ui-runtime` dependency. For API details, read only the
relevant [capability](api/topics.md) and member page.

Use this guide with the installed SDK declarations and the
[ScoreHUD recipe](recipes/score-hud.md). Existing projects retain their own
compatible versions and directory conventions.

## 1. Decide what owns each change

For each UI task, provide the target viewport and interaction, this workflow,
the relevant existing component/Skin pair, selected manifest assets and palette/
font entries. A development build's `bin-debug/.kurot/component-catalog.json`
lists discovered project component tags. Read only relevant API members after
that; the whole engine source or full reference is not an initial context pack.

| Concern | Author here |
| --- | --- |
| Hierarchy, visual layout, colors, control states | Matching `*Skin.kui.xml` |
| View properties, typed part access, UI event translation | Component TypeScript |
| Score, inventory, win/loss, network decisions | Game model/controller |
| Startup, fonts, resource/theme/locale readiness | Main and startup services |
| Scene lifetime, subscriptions, async results, restart/close | Scene/session owner |
| Generated JS, theme map, part declarations | CLI output; regenerate from inputs |

A component may present an entire HUD or dialog. Its XML is still a `Skin`
appearance document. Current CLI compilation does not turn semantic Screen or
reusable-document assets into authored screen XML. `UI-ARCHITECTURE.md` also
contains future design; it is not the production recipe. Programmatic UI
remains supported for a small dynamic subtree or a deliberate Core-only game.

## 2. Use the template's directories

For a new game based on the game template, use this convention. Add directories
when the project needs them; retain existing startup files in older projects.

```text
src/
  Main.ts                         startup and top-level composition
  StyleManager.ts, AssetAdapter.ts, ...  existing startup services
  game/                           game state, rules and round ownership
  scenes/                         scene controllers; connect model and UI
  services/                       persistence, networking and other services
  components/                     only discovered component classes
    hud/ScoreHUD.ts
    dialogs/ResultDialog.ts
    items/RewardItem.ts
resource/
  default.res.json                 authored resource manifest
  config/style.json                fonts, palette and optional Label presets
  config/locale.json               enabled languages
  lang/                            translations
  assets/                          textures, atlases, fonts, sound
  ui/
    skins/                         shared native Button/Panel/etc. skins
    components/                    mirrors src/components exactly
      hud/ScoreHUDSkin.kui.xml
      dialogs/ResultDialogSkin.kui.xml
      items/RewardItemSkin.kui.xml
    app/                           extra standalone Skin appearances, if needed
template/web/index.html             authored loading page/canvas
kurot.config.ts                     authored build/stage/UI configuration
.kurot/skin-parts.d.ts              generated editor/type declarations
bin-debug/.kurot/                   generated development component catalog
bin-debug/, bin-release/            generated runtime output
```

The game template already configures this pairing:

```ts
// UI fragment of kurot.config.ts; retain the project's other fields.
ui: {
  sourceDir: 'resource/ui',
  components: {
    namespace: 'game',
    sourceDir: 'src/components',
    skinDir: 'resource/ui/components',
  },
}
```

Every non-declaration `.ts` under the configured component source directory
requires its relative-path Skin pair. Keep helpers, models, services, tests and
barrel `index.ts` files outside that scanned directory. Each file exports a
concrete, zero-argument-constructible named class matching its basename.

Names are unique across the whole configured namespace, including subfolders:
`hud/ScoreHUD.ts` becomes `<game:ScoreHUD>`, not `<game:hud.ScoreHUD>`. Declare
`xmlns:game="https://kurot.dev/components/game"` when using that tag in XML.
Give its Skin a unique `class`, such as `components.hud.ScoreHUDSkin`. The
relative file pairing establishes the generated theme association; the Skin
class string and XML tag namespace are different identifiers.

## 3. Build the appearance, then bind its parts

1. Add the component and matching Skin files together.
2. Author visual children under
   `<Skin xmlns="https://kurot.dev/ui/1" class="...">`. Skin is nonvisual;
   its children are parented directly to the host Component.
3. Give `id` only to nodes the component must access. Each becomes a public
   skin part; ordinary visual nodes can omit it. Keep IDs stable across edits.
4. Run a CLI build to generate `.kurot/skin-parts.d.ts`. Include
   `.kurot/**/*.d.ts` in the project's TypeScript config, as the game template does.
5. Extend `Component<'components.hud.ScoreHUDSkin'>`; access `this.skinParts`
   inside `onSkinReady()`, after calling the superclass hook. Use generated
   types rather than casts or guessed fields.
6. Detach part listeners/bindings in `onSkinRemoved()` while old parts remain
   available. This hook runs on skin replacement/detachment, not on stage removal.

`createChildren()` runs once on first stage attachment. It is not a repeated
open/restart hook. Store data set before skin readiness, then render it in
`onSkinReady()`. Expose small properties/methods and semantic events such as
`restartRequested`; the controller handles the actual game restart.

`skinParts` throws before attachment. Missing parts after a build usually mean
the wrong `class`, unmatched file pair, omitted `id`, unavailable theme or stale
generated declarations. Correct those inputs instead of editing `.kurot/`.

## 4. Keep layout and resources explicit

- All authored UI sizes, offsets and nine-slice grids are logical units. A 2×
  atlas uses physical source pixels; do not multiply UI coordinates by density.
- Use edge/center constraints for anchored HUDs, explicit layouts for rows,
  columns and grids, and `Scroller` with a Group/List viewport for scrolling.
  `percentWidth=100` means 100 percent. Do not combine a fixed size and opposing
  edge constraints unless the parent's allocation is intentionally authoritative.
- Set line policy explicitly for important text: `multiline`, `wordWrap`,
  `textFit`, `minFontSize`, and top/middle alignment. Text alignment inside the
  Label is independent of `verticalCenter` positioning its box. Test long
  translations, empty strings, large scores and outlined captions.
- Declare Skin states and use `property.state` overrides. A Button already
  owns pressed/disabled/selected behavior; game logic should set its public
  properties rather than simulating those internals.
- Use shared palette entries such as `@style:colors:text` in XML. Numeric colors
  in runtime TS and loaded fonts remain application responsibilities; UI does
  not load style.json itself or implement live theme switching.
- Reference registered atlas frames such as `kui.button_up`. Preserve the
  project's AssetAdapter, preload group and density metadata. Manifest sheet
  subkeys are metadata objects, not legacy comma-separated strings.

## 5. Wait for startup and own teardown

Preserve the starter's order: stylesheet and FontFace readiness → default font
→ Player/preloader → resource manifest → Theme and Skin module → preload assets
→ translations → business UI. Handle Theme `COMPLETE` and `IO_ERROR`, and catch
resource Promise failures. Build success cannot prove image/font readiness.

| Lifetime | Cleanup owner |
| --- | --- |
| Listener/watcher on a skin part | Component, in `onSkinRemoved()` |
| Model/store/DOM/stage subscription | Scene/session, on close or restart |
| Tick, timer, TweenGroup, sound channel | Owner that started/created it |
| Async load result | Owner checks the current scene/session before applying |
| Shared atlas/font/sound resource | Resource owner, after all consumers stop |

Detaching a display object does not dispose all these resources. A cached view
keeps its skin for reuse. Define one idempotent application `dispose()` or
open/close pair and call it from the scene owner; `dispose()` is a project
convention, not a universal Kurot method. Use collection mutation notifications
for live lists, and reset per-item state when renderers are recycled.

## 6. Verify the authored inputs

Run from the game project:

```sh
pnpm build
pnpm exec tsc --noEmit --skipLibCheck false
pnpm release
```

The build first creates skin-part declarations. The project must have a
TypeScript compiler installed for the second command; do not install/upgrade
dependencies implicitly. esbuild compilation alone is not a type check.

Published CLI 3.6.0 can report TS2610 for skinParts when skipLibCheck=false.
CLI 3.6.1 preserves its getter signature and passes that check. After adopting
the fixed CLI, rebuild to regenerate declarations; no Core/UI change, cast or
handwritten generated declaration is needed.

Serve development and release outputs. Check theme/resource/font failures,
portrait/landscape bounds, pointer targets, long localized text and scroll
behavior. Open/close/restart repeatedly: one press must produce one action and
closed UI must stop its model/tick/audio effects. For unrelated scene changes,
preserve existing Skin IDs and authored content rather than regenerating a
whole screen.

For a complete component pair and caller-owned cleanup, use the
[ScoreHUD recipe](recipes/score-hud.md). It also records the compile checks and
which parts still need browser verification in a real game's startup flow.
