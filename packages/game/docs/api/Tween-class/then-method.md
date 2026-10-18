# then

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
then<TResult1 = void, TResult2 = never>(onfulfilled?: ((value: void) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null): PromiseLike<TResult1 | TResult2>;
```

Resolves with `undefined` when the tween completes or is removed.
Completion never rejects; cancellation and natural completion share the
same terminal state.
