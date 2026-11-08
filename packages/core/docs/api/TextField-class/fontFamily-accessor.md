# fontFamily

Package: `@kurot/core@3.2.3`. Generated from public declarations and JSDoc.

```ts
get fontFamily(): string;
set fontFamily(value: string);
```

CSS font-family name, initially TextField.default_fontFamily ('Arial').
Assignment does not load the font. After a late font becomes available, call
invalidateTextMetrics() even if the family string is unchanged.
