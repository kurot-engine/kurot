# loadGroup

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
loadGroup(groupName: string, priority: number, onProgress?: ProgressCallback): Promise<void>;
```

Load all resources in a group. Returns a promise that resolves when done.

`this.loader` is a single shared instance, so running two batches at once
would let the second call's queue/callbacks silently replace the first's
mid-flight. Concurrent calls (for the same or different groups) are
therefore chained onto `groupLoadQueue` and run to completion one at a
time; each call still gets its own promise that resolves/rejects
independently once its turn comes up, and a failed batch doesn't block
the ones queued after it.

The already-loaded filter is recomputed once this call's turn actually
starts (inside `run()`), not at call time — otherwise an
already-queued, overlapping `loadGroup()` call could finish loading some
of these items first, and a stale snapshot would re-load them anyway.

**throws**

When the group is absent/empty or any item exhausts its retries.
Already cached items are skipped; an entirely cached group resolves
without emitting a new progress event. Successfully loaded items remain
cached if another item fails.

**Parameter groupName:** Name of the group to load

**Parameter priority:** Reserved for future prioritized loading; currently unused by `ResourceLoader`

**Default priority:** `0`

**Parameter onProgress:** Optional progress callback

Related types: [ProgressCallback](../ProgressCallback-typealias.md).
