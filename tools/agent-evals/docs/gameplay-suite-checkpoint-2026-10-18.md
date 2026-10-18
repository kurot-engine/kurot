# Expanded gameplay evaluation checkpoint — 2026-10-18

**Stopped at the user's request. The repeated comparison is incomplete.**
No further model calls or scheduled continuation remain active. Nothing was
published, no dependency was upgraded and no existing lockfile was changed.

The [protocol](gameplay-suite.md) and [revision-2 plan](../runners/gameplay-suite-v2.json)
cover resources, Tween and KUI, with five trials per task/arm planned. All three
positive controls pass; all three negative controls compile and fail their
behavior checks. This validates the acceptance harness, not model success rates.

## Observed first handoffs

| Task | Old documentation | New guide/example | Old logical tokens | New logical tokens | Valid external repair rounds |
| --- | --- | --- | ---: | ---: | --- |
| Resources | 1 completed, passed corrected checks | 1 completed, passed corrected checks | 397,097 | 276,429 | 0 / 0 |
| Tween | 1 completed, passed | 1 completed, passed | 408,892 | 293,889 | 0 / 0 |
| KUI | 1 completed, passed | Interrupted before completion/acceptance | 553,273 | Unavailable | 0 / unavailable |

These are five completed initial submissions and one interrupted initial call,
not the planned 30 samples. The KUI pair is incomplete, and no task has the
planned five repetitions per arm. Do not infer comparative success rates,
average repair counts or reliable token savings from this checkpoint. The
separate completed [Coin Lanes baseline](coin-lanes-baseline-2026-10-18.md)
retains its own results and is not pooled with these tasks.

## Resource-oracle correction and excluded overhead

The original resource check restarted a round and then tried to restart again
during active play. The task only required restarting after end. Both initial
submissions disabled Restart while playing and were incorrectly rejected.
Revision 2 finishes each round before restarting; its positive control also
disables Restart during play. Both original first submissions were rescored
without regenerating source or invoking a model. All corrected checks pass.
SDK bytes and prompt bytes were checked before reuse; raw v1 records remain
unchanged.

The invalid feedback nevertheless caused two completed repair calls. Exclude
them from valid task repair counts and token comparisons, but retain their
usage as harness overhead:

| Excluded call | Input | Cached input subset | Output | Logical total |
| --- | ---: | ---: | ---: | ---: |
| resources-1-old, round 1 | 629,921 | 567,552 | 2,488 | 632,409 |
| resources-1-new, round 1 | 529,862 | 484,992 | 2,300 | 532,162 |
| Total | 1,159,783 | 1,052,544 | 4,788 | 1,164,571 |

Completed valid initial calls total **1,929,580 logical tokens**. Including
excluded completed repairs, recorded completed usage totals **3,094,151**.
The interrupted KUI new-arm call has no completion usage and adds an unknown
amount; neither number is the full account charge. Cached input and reasoning
output are subsets. No currency or billed-cost estimate is made.

## Local evidence and continuation boundary

Gitignored reports under `tools/agent-evals/reports/` retain:

- `kurot-gameplay-suite-20261018-v1/evidence/`: original prompts, all model JSONL,
  immutable submissions/results, full SDK/context copies, locks, traces and
  the harness captured before model execution. The enclosing report is marked
  stopped/excluded rather than a completed comparison.
- `kurot-gameplay-suite-20261018-checkpoint/`: corrected resource checks and
  traces, the no-model-call rescoring script, six calibration results and a
  corrected harness snapshot. Relative SDK/context links use the sibling v1
  evidence; keep both report directories together.

The model remains `gpt-6.1-sol` with `medium` reasoning and Codex CLI 0.163.0.
SDK versions and both evidence manifest hashes are recorded in the protocol
and original `experiment.json`. The revision-2 full 30-sample coordinator and
its optional recovery path have not completed a full run. A later evaluation
must explicitly start a new run; this checkpoint does not promise automatic
resumption or silently count unrun samples as failures.

Verification at close: harness TypeScript build passed; all 13 unit tests passed;
three positive controls passed and three behavioral negatives were rejected;
both frozen resource first submissions passed corrected browser acceptance.
