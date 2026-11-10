# response

Package: `@kurot/core@3.4.0`. Generated from public declarations and JSDoc.

```ts
get response(): string | ArrayBuffer | undefined;
```

Native response body, or undefined before send()/after abort(). Inspect only
after COMPLETE. A generic application cast does not parse or validate JSON.
