# data

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
data: unknown;
```

Last loaded result, initially undefined and reset when a new load starts.
Read after COMPLETE. Runtime type follows dataFormat; no generic cast validates
it. Closing the loader does not replace application-owned result cleanup.
