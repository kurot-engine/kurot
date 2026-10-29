# appendElement

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
appendElement(element: ITextElement): void;
```

Appends a rich run without copying the supplied element. Existing plain text
becomes an unstyled first run. Reassign textFlow after mutating a retained run;
in password mode only the appended characters are used.

Related types: [ITextElement](../ITextElement-interface.md).
