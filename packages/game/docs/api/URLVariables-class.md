# URLVariables

Package: `@kurot/game@3.0.0`. Generated from public declarations and JSDoc.

```ts
class URLVariables
```

URLVariables allows transferring variables between an application and a server.

Assign an instance to `URLRequest.data`: for GET requests it's appended to
the URL's query string, for POST requests it's sent as
`application/x-www-form-urlencoded` (via `toString()`). `URLLoader` handles
both cases automatically.

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](URLVariables-class/constructor-constructor.md) |
| `variables` | public | [open](URLVariables-class/variables-property.md) |
| `decode` | public | [open](URLVariables-class/decode-method.md) |
| `toString` | public | [open](URLVariables-class/toString-method.md) |
