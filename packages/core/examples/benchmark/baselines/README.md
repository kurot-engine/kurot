# Performance baselines

This directory contains approved, machine-specific performance baselines.
Do not copy results between machines.

On a named reference machine, run the standard comparison with
`BENCHMARK_MACHINE=<stable-name> pnpm benchmark:compare`. Review variance and
correctness first, then copy `results/baseline-candidate.json` here as
`<stable-name>.json`. Future standard comparisons on that machine apply it
automatically when the exact Playwright browser version still matches.

Replace a baseline only after an intentional performance change or browser
upgrade has been reviewed. Baseline rows with fewer than five samples are
recorded but never used as release gates.
