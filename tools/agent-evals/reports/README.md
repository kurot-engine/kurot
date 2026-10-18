# Reports

Generated evaluation summaries belong here. Large raw traces, screenshots, and
model transcripts should remain local or be uploaded as CI artifacts rather
than committed by default.

The local `kurot-doc-eval-20261018-v1/SUMMARY.md` contains the first real 3+3
documentation comparison. Its durable, committed summary is
[the dated baseline](../CHANGELOG.md#coin-lanes-documentation-baseline--2026-10-18). The sibling
`evidence/` directory retains raw inputs/outputs and an exact harness snapshot;
test commands exclude reports so those archived tests never run as current tests.

The stopped `kurot-gameplay-suite-20261018-v1/` pilot preserves raw evidence,
including invalid resource-oracle feedback. Its sibling
`kurot-gameplay-suite-20261018-checkpoint/` holds corrected resource rescoring,
six calibration controls and a corrected harness snapshot. Neither is a completed
30-sample benchmark. See the [durable checkpoint](../CHANGELOG.md#expanded-gameplay-evaluation-checkpoint--2026-10-18).
