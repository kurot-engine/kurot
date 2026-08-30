# Agent Eval Schema versioning

Task definitions and run records carry an explicit string `schemaVersion`.
Version `1` is the first stable contract.

## Compatibility rules

- Adding an optional property is backward compatible and does not change the
  schema version.
- Adding a required property, removing or renaming a property, changing its
  meaning, or narrowing accepted values requires a new schema version.
- Writers emit only the newest supported version.
- Readers must reject unknown versions instead of guessing their meaning.
- Historical reports are immutable. A migration creates a new record and
  retains the original input as evidence.
- Every migration is a named, deterministic function from one adjacent version
  to the next, such as `migrateTaskV1ToV2`.
- Migrations must have fixtures for the oldest supported input, the migrated
  output, repeatability, and failure on invalid source data.

## Version 1 policy

There is currently no migration because version `1` is the only supported
version. When version `2` is introduced, add separate v2 schemas and migration
functions; do not modify the meaning of the committed v1 schemas.
