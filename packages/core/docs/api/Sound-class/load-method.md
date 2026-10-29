# load

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
load(url: string): void;
```

Starts asynchronous loading; completion dispatches COMPLETE and network or
terminal media errors dispatch IO_ERROR. It returns no Promise. A new load
supersedes earlier callbacks but does not stop channels already playing.
