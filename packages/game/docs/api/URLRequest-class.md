# URLRequest

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
class URLRequest
```

Captures all information in a single HTTP request, Egret-compatible.

**example**

```ts
import { URLRequest, URLRequestHeader, URLRequestMethod } from '@kurot/game';

const req = new URLRequest('https://example.com/data.json');
req.method = URLRequestMethod.POST;
req.data = JSON.stringify({ key: 'value' });
req.requestHeaders.push(new URLRequestHeader('Content-Type', 'application/json'));
```

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](URLRequest-class/constructor-constructor.md) |
| `data` | public | [open](URLRequest-class/data-property.md) |
| `method` | public | [open](URLRequest-class/method-property.md) |
| `requestHeaders` | public | [open](URLRequest-class/requestHeaders-property.md) |
| `url` | public | [open](URLRequest-class/url-property.md) |
