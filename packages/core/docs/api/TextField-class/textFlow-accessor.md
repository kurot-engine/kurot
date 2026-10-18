# textFlow

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
get textFlow(): ITextElement[] | undefined;
set textFlow(value: ITextElement[] | undefined);
```

Rich text runs, initially undefined. Assignment and reads expose the run
array by reference; reassign after external edits to invalidate measurement.
Defined runs replace plain text with their concatenation. Assigning undefined
clears styling while retaining the current plain characters.

Related types: [ITextElement](../ITextElement-interface.md).
