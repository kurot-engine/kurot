# Documentation entry comparison

## Question and treatment

Can an agent deliver a complete small game more reliably or with less context
after the documentation cleanup and new game-authoring guide/reference?

The executable task is [Coin Lanes](../tasks/gameplay/coin-lanes.json).
Unlike the continuous movement in Star Catcher, it uses discrete lanes and a
different deterministic coin/life rule. Both arms receive exactly the same
task and blank, buildable scaffold. Only supplied documentation/reference
files differ:

- **old**: the root AGENTS, public documentation, templates and examples at
  the pinned baseline Git revision before the documentation changes;
- **new**: the corresponding working-tree files, including the concise root
  entry, guide and complete Star Catcher reference.

These are the combined step 1/2 changes. This experiment cannot attribute an
effect separately to root trimming, corrections, the guide or the example.
Engine source is not supplied; the installed public SDK/types are identical.
Current release history remains available on demand in the new arm.
Only textual md/ts/json/html/yaml/xml/kui files are copied; binary assets are
omitted in both arms for this asset-free task.

## Frozen inputs

[The plan](../runners/coin-lanes.json) fixes model `gpt-6.1-sol`, reasoning
`medium`, Codex CLI `0.163.0`, Core `2.5.4`, CLI `3.3.1`, TypeScript `5.9.3`,
tsx `4.21.0`, Playwright `1.62.1`, three trials per arm, order old/new/new/old/
old/new, a ten-minute limit per model turn and at most two external repairs.
The plan is written before model runs. The interleaved order reduces simple
ordering effects; it is not randomized and cannot remove cache effects.

The runner checks installed versions, copies Star Catcher's node_modules once,
and gives every trial the same SDK directory. Its lock, all copied dependency
files and symlink targets are hashed; the SDK hash is checked after every model
turn. No dependency resolver, install, version bump or release runs.
Manifest fingerprints hash compact JSON (`JSON.stringify(JSON.parse(file))`)
with recorded key order. Individual entries hash raw file bytes, or the UTF-8
string `symlink:<target>` for a symbolic link.
Context files are copied once before the first trial, with per-file SHA-256
manifests and a resolved baseline commit. The working-tree overlay is retained
as files, not misrepresented as part of that commit. Every attempt's submitted
source and HTML are saved before any repair.

`experiment.json` retains the plan, CLI arguments, source fingerprints, Node/
OS versions and limitations. `contexts.json`, `sdk-files.json`, task, plan and
all raw artifacts live in the selected output directory. Generated compact
reports in `reports/` are ignored by Git and link to that directory. Keep the
output directory to reproduce this exact overlay after future repo edits.

## Execution and acceptance

Use `pnpm compare:docs <new-absolute-output-directory>` from this tool. The
directory must not exist. Read [the tool README](../README.md) for setup.
The CLI uses its existing ChatGPT login, ignores user config, disables apps,
multi-agent tools, memories and web search, and uses workspace-write with
approval policy never. It receives no API-key environment variables; the
child environment contains only standard login/shell/path/locale variables.
User/project execution rules remain enabled. No new key is provisioned.

Each job is a fresh ephemeral CLI session. Root AGENTS is automatically in its
project; relevant docs and examples are available under their normal paths.
The model can inspect public declarations and self-check type/build commands.
It may edit only src/ and the HTML template. The external oracle stays outside
the job directory and is never copied into supplied context. Protected fixture
and context contents are checked before acceptance.

Acceptance performs a strict TypeScript check and deletes old build output
before a real CLI build. Local HTTP and Chromium then exercise three separate
fresh pages with a controlled clock:

| Scenario | Executable requirements |
| --- | --- |
| Input/score | Start from ready, real arrow/D input changes lanes, touch selects logical lanes, first center coin scores exactly once |
| End/restart | Deterministic center play ends at score 2/lives 0, ended state freezes, four restarts reset and preserve listener counts, one key still changes one lane, Close disables controls/removes listeners/freezes status |
| Mobile/exit | A 360px viewport has no horizontal overflow, touch selects lane 2 after scaling, pagehide disposes and removes input listeners |

All scenarios require a visible canvas and reject console, page and HTTP
errors. Screenshots and Playwright traces are retained for every scenario.
CDP counts keydown/keyup/blur/pagehide listeners on window/document/canvas.
This checks observable cleanup and listener accumulation; it is not a heap
leak proof or exhaustive inspection of every timer/ticker callback.

The accessibility output is a required public UI contract, not an injected
test bridge. Screenshots still need human inspection for visual quality;
there is no automated aesthetic grade or claim of exhaustive gameplay proof.

## Measurements

**First success** means the first model handoff passes every external check.
Self-checks or edits inside that model turn do not count as external repairs;
they remain in the JSONL and token cost. A successful CLI exit alone does not
mean success. **Final success** means acceptance passed within the repair cap.
**Repair rounds** count additional model invocations with the same task, current
files and the failed-check descriptions. Repairs start fresh sessions rather
than resuming hidden conversation state. Every arm uses the same policy.

Raw `turn.completed.usage` supplies input, cached input, output and reasoning
output counts. **Total tokens = input + output**; cached input and reasoning
output are subsets, never added again. Preserve first-attempt and all-attempt
breakdowns. These are logical token counts, not a currency bill or an estimate
of tokenizer length from document bytes. CLI/tool overhead is included equally
in the procedure, not subtracted using a guessed constant.

Missing/failed/duplicate completion usage is an error, never zero. Tool/auth/
timeout/browser-infrastructure failures stop that job, remain in its record
and make aggregate usage incomplete. They must be reported separately from
gameplay failures; do not silently drop or replace them with successful runs.

This comparison has its own `kurot-doc-comparison-v1` evidence format. It uses
the existing validated EvalTask v1 contract but does not fabricate an EvalRun
v1: visualAccepted and API-misuse taxonomy were not scored. Existing task/run
schemas and their meanings remain unchanged.

## Limits

Three trials per arm on one task produce a pilot baseline, not a stable general
success-rate estimate. The provider exposes a model identifier, not immutable
weights or a sampling seed. Read access is not isolated in another machine or
container; the prompt restricts reads to the supplied project, and raw commands
must be audited for out-of-project access. Shared SDK symlinks are outside the
project's writable scope, but the host temporary directory is not a security
boundary. Inspect fingerprints for changes and audit submitted game code before
treating the results as evidence. No claim of causal significance follows from
this sample, especially when both arms pass.

The runner deliberately reuses frozen tools from the independent Star Catcher
installation rather than changing this tool's dependency lock. Its browser
adapter addresses that pinned pnpm layout; changing the plan's Playwright version
requires updating and validating the adapter explicitly.

For the CLI's JSONL and saved-login behavior, see the
[official non-interactive execution documentation](https://learn.chatgpt.com/docs/non-interactive-mode).
