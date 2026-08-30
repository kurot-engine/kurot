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
├── runners/     Future model and browser runner implementations
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

## Initial scope

The first milestone is intentionally limited to SLOT and Crash Game clients.
Its ten tasks cover a static SLOT layout, spin flow, reel stop order, win
presentation, quick stop, next-spin cleanup, a static Crash layout, round flow,
cash-out presentation, and snapshot recovery. Backend behavior is represented
by deterministic fixtures and replay adapters, never by a production service.

Every task must have a machine-executable acceptance contract before it counts
toward the baseline.

No runner is claimed as implemented yet. The current foundation only defines
the stable evaluation records and directory ownership needed to build one.

Task and run data are validated at runtime with versioned JSON Schemas. See
[`docs/schema-versioning.md`](docs/schema-versioning.md) before changing either
contract.
