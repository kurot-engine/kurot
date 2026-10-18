# load

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
load(url: string): void;
```

Start an image URL request, cancelling the prior request first. Success
replaces data and emits COMPLETE; browser load failure emits IO_ERROR and leaves
the previous data available. Replaced bitmap data is not automatically disposed.
