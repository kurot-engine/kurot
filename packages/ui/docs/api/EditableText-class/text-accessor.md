# text

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
get text(): string;
set text(value: string);
```

The text content displayed by this component.

Plain text, initially empty. Assignment invalidates size/layout and notifies
text bindings. Use RichLabel for styled runs; Label has no public textFlow.
