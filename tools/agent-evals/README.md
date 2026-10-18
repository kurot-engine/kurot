# Kurot Agent Evals

Internal evaluation project for measuring whether an Agent can generate,
run, inspect, and repair Kurot games. It evaluates the complete Kurot toolchain
and is intentionally located in the repository tooling area instead of inside
a runtime or publishable package.

This directory is private infrastructure and is never published to npm.

## Directory map

```text
tools/agent-evals/
├── tasks/       Versioned task definitions grouped by capability
├── fixtures/    Deterministic inputs shared by tasks
├── runners/     Pinned experiment plans and runner entry documentation
├── rubrics/     Machine checks and human/visual scoring rules
├── reports/     Generated evaluation results
├── docs/        Harness contracts and schema-versioning policy
├── src/         Shared TypeScript contracts and harness code
└── test/        Harness unit tests
```

## Commands

This project has an independent install and lockfile, matching the repository's
non-workspace package model:

```bash
pnpm --dir tools/agent-evals install
pnpm --dir tools/agent-evals build
pnpm --dir tools/agent-evals test
```

## Documentation comparison

The first executable experiment is `gameplay.coin-lanes`: a Core-only game
with keyboard/touch input, deterministic scoring, lives, game over, restart
and disposal. See [the protocol](docs/documentation-comparison.md).

It uses the existing authenticated Codex CLI, not an API-key application.
The [2026-10-18 baseline](docs/coin-lanes-baseline-2026-10-18.md) records the
first completed 3+3 comparison and its evidence fingerprints.
The plan pins the model identifier, reasoning effort, CLI and SDK versions.
It reuses Star Catcher's frozen browser/compiler tools; it does not install
or upgrade dependencies. First install the reference project's exact lock if
it is not already installed:

```sh
pnpm --dir examples/star-catcher install --frozen-lockfile
codex login status
pnpm --dir tools/agent-evals build
pnpm --dir tools/agent-evals test
pnpm --dir tools/agent-evals test:oracle
pnpm --dir tools/agent-evals compare:docs /absolute/path/to/a-new-output-directory
```

Use the repository's pinned pnpm 10.33.0. A real run consumes the signed-in
account's Codex allowance. It launches six isolated CLI jobs sequentially and
up to two repair turns per job, with local headless Chromium acceptance.
Generated reports point to the retained local context snapshots, submissions,
JSONL usage, command logs, screenshots and browser traces. Nothing is published.

The [expanded gameplay protocol](docs/gameplay-suite.md) adds resource loading,
native Tween and compiled KUI tasks, with five planned repetitions per arm.
Its three positive and three negative controls are calibrated. The real run
was stopped before completion; see the [2026-10-18 checkpoint](docs/gameplay-suite-checkpoint-2026-10-18.md).
No repeated-comparison conclusion is claimed for this extension.

## Planned domain scope

The first milestone is intentionally limited to SLOT and Crash Game clients.
Its ten tasks cover a static SLOT layout, spin flow, reel stop order, win
presentation, quick stop, next-spin cleanup, a static Crash layout, round flow,
cash-out presentation, and snapshot recovery. Backend behavior is represented
by deterministic fixtures and replay adapters, never by a production service.

Every task must have a machine-executable acceptance contract before it counts
toward the baseline.

The SLOT/Crash tasks remain planned; the executable documentation experiment
does not claim to cover them.

Task and run data are validated at runtime with versioned JSON Schemas. See
[`docs/schema-versioning.md`](docs/schema-versioning.md) before changing either
contract.
