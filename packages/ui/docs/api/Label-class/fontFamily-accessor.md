# fontFamily

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
get fontFamily(): string;
set fontFamily(value: string);
```

CSS font family copied from TextField defaults (initially Arial). Assignment
does not load a font. After asynchronous font readiness, invalidateSize() to
refresh metrics and fitting.
