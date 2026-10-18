# Public API reference and package distribution

Core, Game and UI distribute their current generated API references under
`docs/api/`. Use the version installed in the consumer project.

| Package | Read by capability | Look up a symbol |
| --- | --- | --- |
| Core | [topics](../packages/core/docs/api/topics.md) | [API index](../packages/core/docs/api/index.md) |
| Game | [topics](../packages/game/docs/api/topics.md) | [API index](../packages/game/docs/api/index.md) |
| UI | [topics](../packages/ui/docs/api/topics.md) | [API index](../packages/ui/docs/api/index.md) |

For game development, read the installed package version's `docs/api/topics.md`,
then the relevant capability, symbol and member pages. Use `api-index.json` for
name-to-file lookup and `supporting/index.md` for parameter/result definitions.
The game authoring guide and complete examples explain composition/lifecycle;
the API reference gives exact signatures, overloads, defaults and available
JSDoc. A consumer needs installed runtime code, public declarations and docs;
engine source is not required for these lookups.

For standard UI production, use [UI authoring](../packages/ui/docs/ui-authoring.md)
and its [paired ScoreHUD recipe](../packages/ui/docs/recipes/score-hud.md).
They describe project organization, component/Skin ownership and cleanup.
CLI templates supply project README/AGENTS entries. Keep a short project README/AGENTS
entry pointing at the selected workflow, installed versions and relevant member
pages; providing all API pages or engine source in each prompt is unnecessary.

The reference follows public entry points, not every file exported somewhere
inside the repository. Public and protected members include inherited contracts.
Private, explicitly internal/hidden and implementation-prefixed members are
excluded. Supporting types may appear in signatures without being exported from
the root; their pages do not authorize new import paths. Browser/standard
library types retain their platform definitions.

Each package's `coverage.json` records declaration coverage and remaining
behavioral-comment gaps separately. Automatic signature extraction does not
establish resource ownership, asynchronous error behavior or cleanup policy;
maintain those contracts in source JSDoc and the linked topic guides. Current
gaps remain visible rather than being filled with guessed behavior.

Common game contracts have source JSDoc at their declaration. Use these
member pages directly when a task needs only one behavior:

| Need | Read |
| --- | --- |
| Logical coordinates and pointer space | [TouchEvent.localX](../packages/core/docs/api/TouchEvent-class/localX-accessor.md) |
| Timer units and owned cleanup | [Timer.stop](../packages/core/docs/api/Timer-class/stop-method.md) |
| Audio seconds, looping and channels | [Sound.play](../packages/core/docs/api/Sound-class/play-method.md) |
| Tween timing and repeat defaults | [TweenOptions](../packages/game/docs/api/TweenOptions-interface.md) |
| External frame-animation scheduling | [MovieClip.play](../packages/game/docs/api/MovieClip-class/play-method.md) |
| Skin replacement versus stage removal | [Component.onSkinRemoved](../packages/ui/docs/api/Component-class/onSkinRemoved-method.md) |
| Image loading failures and texture ownership | [Image.source](../packages/ui/docs/api/Image-class/source-accessor.md) |
| Multi-property binding teardown | [Binding.bindProperties](../packages/ui/docs/api/Binding-class/static-bindProperties-method.md) |

These comments document current behavior, including missing validation or error
forwarding; they do not add new runtime guarantees. UI inherits some defaults
from the installed Core version, so those differences are stated explicitly.

Generation and validation live in private [tools/api-docs](../tools/api-docs/README.md).
The tool checks exported names/members independently, rejects stale generated
files and new comment gaps, and strictly compiles extracted JSDoc examples.
Local package verification extracts real tarballs into a consumer with no engine
source, checks document distribution/version matching and compiles those same
examples against the packed declarations.

## Package consumption

Read public declarations and bundled docs from the same installed SDK version.
Generated references do not require engine source in a consumer project.
Repository documentation updates enter package archives through a subsequent
release; existing npm archives retain their original contents.

The CLI build generates `.kurot/skin-parts.d.ts`. Rebuild after changing Skin
inputs or adopting a CLI declaration fix, then typecheck the project. Runtime
packages, CLI tooling and application installations are independent; use the
[dependency policy](dependency-policy.md) when changing those dependencies.
