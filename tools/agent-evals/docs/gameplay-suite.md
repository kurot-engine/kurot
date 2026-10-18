# Resource, Tween and KUI documentation comparison

Evaluation work is **paused**. No background run or automatic continuation is
scheduled. Recorded results and limitations are in [CHANGELOG.md](../CHANGELOG.md).

## Frozen experiment

[The current plan](../runners/gameplay-suite-v2.json) specifies three tasks,
two documentation arms and five repetitions per task/arm: 30 samples. Model
identifier `gpt-6.1-sol`, reasoning `medium`, Codex CLI `0.163.0`, timeout ten
minutes, at most two external repair rounds. Each matched pair may run two model
jobs concurrently; browser acceptance is serialized. Task order rotates between
repetitions and arm order alternates. A model identifier does not pin server-side
weights indefinitely.

The documentation treatment is the same as the Coin Lanes comparison protocol:
old Git revision `2a7176c`, versus the frozen new guide/example context. Both arms
can read installed SDK types and documentation; only their repository context
differs. The context manifest SHA-256 is
`448f8b52fcde44058723e011d4f9ceeeedf7dc2fd7f67900e5f83dd727868273`.
The runner refuses a changed treatment.

Existing installations are copied without running an installer. The fixed SDK
is Core 2.5.4, Game 2.0.0, UI 3.1.0, CLI 3.3.1, top-level ui-document 0.13.0,
TypeScript 5.9.3, tsx 4.21.0 and Playwright 1.62.1. The older UI/CLI baseline is
intentional. Original locks and all installed transitive bytes are retained;
this is not a claim that every nested package resolves to the top-level version.
The SDK manifest hash is
`5ff07b6639e2bf1821edae5afba6843ce95ae8b22bf7a02af1f015a91549f776`.
Manifest hashes use SHA-256 of `JSON.stringify` of the ordered file-hash map;
individual files hash their bytes, and links hash `symlink:<target>`.

## Tasks and acceptance

| Task | Required behavior | Independent browser checks |
| --- | --- | --- |
| [Asset Hunt](../tasks/gameplay/asset-hunt.json) | Resource config/group loading, real Bitmap, JSON-driven score/goal, progress, retry, restart after end, disposal | Changed runtime rules; controlled HTTP failure/retry; late loading completion after close |
| [Tween Sprint](../tasks/gameplay/tween-sprint.json) | Native Game Tween, interpolation, pause/resume, three laps, restart and disposal | Actual object positions and Tween counts; repeated cancellation; no callbacks after close/pagehide |
| [KUI Quiz](../tasks/gameplay/kui-quiz.json) | Compiled XML skins, generated typed parts, native Buttons/Labels, three questions, score, restart and disposal | Theme/module requests and real component types; wrong/correct answers and disabled controls; mobile and cleanup |

All tasks require an exported app and observable status attributes. Acceptance
also checks fixture integrity, public SDK usage, compilation and strict type
checking. KUI declarations are generated before type checking. Browser checks
exercise desktop/mobile viewports, capture screenshots/traces and reject
unexpected console/network errors. The resource retry case permits only its
intentional rules-file HTTP 503 responses and related error diagnostics; page
exceptions still fail. Input cleanup counts handlers from the game's own origin,
excluding Playwright-injected listeners. These are functional checks, not a
complete visual-quality or memory-leak audit.

Hidden local positive controls implement all three tasks. Negative controls
respectively break resource paths, leave paused Tweens allocated, and double
quiz points. Calibration must accept all three positives; all three negatives must still
compile and be rejected by behavior checks. Control implementations are outside the model
context and consume no model tokens.

## Accounting and retained evidence

First success means the first external handoff passes every acceptance check;
the agent may run its own checks before handing off. Final success allows up to
two externally requested repairs. Record both rates and repair counts per task
and arm. Infrastructure failures and incomplete usage remain explicit.

Logical total tokens equal input plus output, summed across all attempts,
including failed attempts and repairs. Cached input and reasoning output are
subsets, not extra tokens. Missing completion usage is unavailable, never zero.
Report cached/uncached input separately; logical totals are not billed cost.
Five trials per arm provide a small exploratory sample, not a general claim.

Each run retains prompts, raw JSONL, submissions, checks, command logs,
screenshots, traces, context snapshots, original locks, SDK file hashes and a
harness snapshot under local gitignored `reports/`. Historical summaries in CHANGELOG.md remain available to fresh checkouts;
large local evidence is not committed by default.

## Running later

Use the installed pnpm 10.33.0 and the existing authenticated ChatGPT Codex CLI.
These commands do not install dependencies, publish packages or update locks.
The final command consumes the signed-in account's model allowance.

```sh
pnpm --dir tools/agent-evals build
pnpm --dir tools/agent-evals test
pnpm --dir tools/agent-evals calibrate:suite /absolute/new-calibration-directory
pnpm --dir tools/agent-evals compare:suite /absolute/new-run-directory /absolute/calibration-directory
```

Use `gameplay-suite-v2.json` for new comparisons. The optional fourth runner
argument rescores an existing resource pair without resuming the remaining jobs.
SDK/context hashes, model arguments and prompt bytes must match that evidence.
See the tool changelog for earlier oracle limitations.
