# URLVariables

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
class URLVariables
```

URLVariables allows transferring variables between an application and a server.

Assign an instance to `URLRequest.data`: for GET requests it's appended to
the URL's query string, for POST requests it's sent as
`application/x-www-form-urlencoded` (via `toString()`). `URLLoader` handles
both cases automatically.

Egret-compatible: egret.URLVariables

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](URLVariables-class/constructor-constructor.md) |
| `variables` | public | [open](URLVariables-class/variables-property.md) |
| `decode` | public | [open](URLVariables-class/decode-method.md) |
| `toString` | public | [open](URLVariables-class/toString-method.md) |
