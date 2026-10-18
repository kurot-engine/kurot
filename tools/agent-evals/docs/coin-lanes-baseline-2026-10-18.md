# Coin Lanes documentation baseline — 2026-10-18

Both documentation entries delivered a working game on the first external
handoff in all three trials. The new entry used **34.1% fewer mean total
tokens** in this small sample. This run provides evidence of lower context
use for this task; success rate and repair rounds were equal.

## Controlled setup

- Task: [gameplay.coin-lanes](../tasks/gameplay/coin-lanes.json), a complete
  three-lane coin-catching game with keyboard/touch, score, lives, game over,
  restart and cleanup. No assets, backend, UI or Game package.
- Model: `gpt-6.1-sol`, reasoning `medium`; Codex CLI `0.163.0`, existing
  ChatGPT login. The provider exposes no immutable model snapshot or seed.
- SDK/tools: Core `2.5.4`, CLI `3.3.1`, TypeScript `5.9.3`, tsx `4.21.0`,
  Playwright `1.62.1`; Node `26.11.1`. No install or dependency upgrade ran.
- Old context: Git `2a7176ca4f9fb4b76c191863ed5b0ea6c31787d3`.
  New context: the frozen working-tree documentation and reference overlay.
- Order: old/new/new/old/old/new. Same task, scaffold, permissions and oracle.
  Three trials per arm, at most two external repairs, ten minutes per turn.
- First success means every external check passes after the first handoff.
  Model self-checks remain inside that turn and its usage. The six transcripts
  contained no TypeScript error diagnostics from those self-checks.

The [protocol](documentation-comparison.md) defines scope, token accounting,
acceptance and limitations. The [plan](../runners/coin-lanes.json) pins inputs.
The treatment combines root trimming, documentation corrections, the guide and
the example; their individual effects cannot be separated by this experiment.

## Results

| Metric | Old entry | New guide/reference entry |
| --- | ---: | ---: |
| First external success | 3/3 | 3/3 |
| Final success | 3/3 | 3/3 |
| External repair rounds per trial | 0, 0, 0 | 0, 0, 0 |
| Mean total tokens | 403,893 | 266,290 |
| Median total tokens | 455,206 | 271,922 |
| Mean input tokens | 396,773.7 | 260,834.3 |
| Mean cached input tokens | 346,026.7 | 220,629.3 |
| Mean uncached input tokens | 50,747 | 40,205 |
| Mean output tokens, including reasoning | 7,119.3 | 5,455.7 |
| Total tokens across three trials | 1,211,679 | 798,870 |

Total tokens are **input + output**. Cached input and reasoning output are
subsets and are not added again. Mean uncached input fell by 20.8%. These are
CLI-reported logical token counts, including agent/tool overhead, rather than
a currency bill. Cache and account charging rules require separate accounting.

| Trial | Entry | First success | Input | Cached input | Output | Total | Repairs |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| 01 | old | yes | 291,046 | 242,560 | 4,985 | 296,031 | 0 |
| 02 | new | yes | 223,955 | 189,952 | 5,232 | 229,187 | 0 |
| 03 | new | yes | 292,194 | 241,152 | 5,567 | 297,761 | 0 |
| 04 | old | yes | 449,735 | 398,208 | 5,471 | 455,206 | 0 |
| 05 | old | yes | 449,540 | 397,312 | 10,902 | 460,442 | 0 |
| 06 | new | yes | 266,354 | 230,784 | 5,568 | 271,922 | 0 |

All three new-arm transcripts read both the guide and Star Catcher reference.
The old arm had neither file. Completed shell commands showed no out-of-project
read candidates or external downloads in the audit. This is a command audit,
not proof of host filesystem isolation.

## Acceptance and evidence

Each submission passed protected-file/SDK integrity checks, strict typing,
a fresh CLI development build and three real Chromium scenarios. The 18
browser scenarios cover input/scoring, end/restart/Close, and mobile/pagehide.
Console/page/HTTP errors were rejected. No formal run timed out or lost usage.
Screenshots support visual inspection; no aesthetic score was assigned.

The local, Git-ignored report is
`reports/kurot-doc-eval-20261018-v1/SUMMARY.md`. Its `analysis.json` contains
derived statistics and audit details; `comparison.json` retains per-attempt
checks and usage. The `evidence/` capsule contains the exact context, SDK,
lock, task, plan, harness source, submissions, model JSONL, compiler logs,
screenshots and traces. Trial SDK links were made relative during archival;
`relocation.json` records that change. SDK bytes and raw records are unchanged.
Raw evidence remains local and is not distributed in a fresh Git checkout.

Provenance SHA-256:

```text
context manifest: 448f8b52fcde44058723e011d4f9ceeeedf7dc2fd7f67900e5f83dd727868273
SDK files/links:  87e4c645bce88fcd8f460ae39f7cdf10f53f013a3b15e22260d7d928c279aa09
```

## Calibration excluded from arm statistics

The initial scaffold incorrectly placed the entry filename placeholder outside
a module script element. The real positive-control game exposed this error;
the scaffold was corrected before the formal comparison. The oracle then
accepted the correct game and rejected a doubled-score variant.

The excluded calibration used 16,993 tokens for the READY probe and 540,967
for a completed pilot turn. Its interrupted repair has no completion usage;
that usage is unavailable, not zero. Calibration records are retained separately
under `reports/kurot-doc-eval-20261018-v1/calibration/`. Known completed usage
including the formal experiment is 2,568,509 tokens, plus that unavailable
interrupted-turn usage.

## Interpretation

The old entry already supported this small game. The observed benefit is less
context use, with clear variation between trials. Three samples on one
Core-only task cannot establish a general success-rate improvement or predict
results for resources, animation, KUI or larger games. The interleaved order
and preserved cache counts help inspect ordering effects but do not eliminate
them. No SDK release, dependency upgrade or external publication occurred.
