# currentState

Package: `@kurot/ui@5.2.3`. Generated from public declarations and JSDoc.

```ts
get currentState(): string;
set currentState(value: string);
```

Effective state name. Unknown nonempty requests use the first declared
state; an undeclared empty name clears overrides. Stateless skins retain
the supplied name without applying overrides. Reassigning the same
effective state leaves its overrides and display children untouched.
