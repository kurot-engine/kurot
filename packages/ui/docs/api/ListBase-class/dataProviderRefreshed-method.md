# dataProviderRefreshed

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
protected dataProviderRefreshed(): void;
```

Extension hook: protected; available to subclasses.

Called when the data provider is reset or refreshed (egret parity).
Re-applies [requireSelection](requireSelection-accessor.md) logic so that the first item is
automatically selected when the data source is replaced.
