# font

Package: `@kurot/ui@5.0.0`. Generated from public declarations and JSDoc.

```ts
get font(): string | BitmapFont | undefined;
set font(value: string | BitmapFont | undefined);
```

Borrowed BitmapFont or configured font-resource name, initially undefined.
Strings are resource keys, not arbitrary URLs. Loading success dispatches
COMPLETE; failed loads or wrong resource types dispatch IO_ERROR with source
and error data. New assignments invalidate old requests' results. Disposed UI
contexts ignore both successful and failed replies. Stage removal
does not cancel shared resource loading; clear/change font on permanent closure
and let the resource owner release it after pending work completes.

Related types: [BitmapFont](../../../../core/docs/api/BitmapFont-class.md).
