# Runners

`coin-lanes.json` is the pinned documentation-comparison plan. Implementation
is in `src/comparison/`; run `pnpm compare:docs <new-output-directory>` here.
See [the protocol](../docs/documentation-comparison.md) for prerequisites,
acceptance, token accounting and limitations. No runner reads or copies login
secrets into evidence; Codex reuses its own saved authentication.

`gameplay-suite-v2.json` pins the expanded 30-sample resource/Tween/KUI plan.
Run `pnpm calibrate:suite <new-calibration-directory>` before
`pnpm compare:suite <new-output-directory> <calibration-directory>`.
See [the expanded protocol](../docs/gameplay-suite.md) and its incomplete-run
checkpoint. `gameplay-suite.json` preserves the historical v1 plan, whose
resource Restart expectation was corrected in revision 2.
