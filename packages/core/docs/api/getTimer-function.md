# getTimer

Package: `@kurot/core@3.4.0`. Generated from public declarations and JSDoc.

```ts
getTimer(): number;
```

Returns engine milliseconds. Default mode uses wall time since engine start;
continue mode uses the shared logical clock, including during catch-up and
outside callbacks. Business pauses and stopped intervals do not advance it.
Use Date.now() for real-world/server deadlines, never mix the two clocks.
