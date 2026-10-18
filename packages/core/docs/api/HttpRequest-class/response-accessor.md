# response

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
get response(): string | ArrayBuffer | undefined;
```

Native response body, or undefined before send()/after abort(). Inspect only
after COMPLETE. A generic application cast does not parse or validate JSON.
