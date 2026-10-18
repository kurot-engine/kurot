# Public API reference and package distribution

Core, Game and UI carry generated API references under `docs/api/` in prepared
patches Core 2.5.5, Game 2.0.1 and UI 3.6.1. None of these patches is published;
existing registry artifacts have not been replaced.

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

Common game contracts now have source JSDoc at their declaration. Use these
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

The SDK build scripts, public exports, APIs and dependency ranges are unchanged.
Only comments changed in engine source. Package publication and dependency
adoption remain separate, explicitly authorized work.

## Documentation patch adoption

The three patch versions are for distributing the reference, JSDoc and guides;
Game also adds its previously omitted docs/ package allowlist. They do not add
runtime requirements or fix implementation behavior.

| Consumer | Required migration | Optional adoption after publication |
| --- | --- | --- |
| UI/Game/DragonBones and compatible Spine Core peers | None; existing Core ranges accept 2.5.5 | Install the Core patch for its bundled docs |
| ui-runtime Core/UI peers | None; ^2.4.0 / ^3.4.0 accept the patches | Refresh its development locks separately if desired |
| SDK development installations | None; tested older accepted baselines remain valid | Refresh only when explicitly requested |
| demo/game examples and applications such as Editor/Reskin | None; runtime and formats are unchanged | Update selected installations/locks to read bundled docs |
| Star Catcher's exact Core 2.5.4 pin | None; the guide and game still use that API | Change its exact pin only if bundled patch docs are needed |
| CLI templates | No template change; latest placeholders stay unchanged | Future create commands resolve the then-published registry versions |
| CLI, ui-document, bitmap-font and Atlas | None | No release or dependency change required |

Existing games may read repository docs without upgrading their runtime. Only
Core/Game/UI source versions change here; all dependency declarations, SDK/app
locks and other package versions retain their existing values.
