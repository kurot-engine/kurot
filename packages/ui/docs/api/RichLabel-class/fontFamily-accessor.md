# fontFamily

Package: `@kurot/ui@5.2.3`. Generated from public declarations and JSDoc.

```ts
get fontFamily(): string;
set fontFamily(value: string);
```

CSS font family used by runs without an explicit family. Initially captured
from UIContext or Core at construction. Assignment does not load fonts.
After late font readiness, call invalidateSize() to refresh measurement.
