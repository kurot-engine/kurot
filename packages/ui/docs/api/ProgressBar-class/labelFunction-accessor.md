# labelFunction

Package: `@kurot/ui@5.3.0`. Generated from public declarations and JSDoc.

```ts
get labelFunction(): ((value: number, maximum: number) => string) | undefined;
set labelFunction(fn: ((value: number, maximum: number) => string) | undefined);
```

Formats the unrounded displayed value and maximum. The default animated
label uses the decimal precision of authored values and bounds.
