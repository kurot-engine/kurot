# getSkinPartValidator

Package: `@kurot/ui@5.1.0`. Generated from public declarations and JSDoc.

```ts
protected getSkinPartValidator(_name: string): ((value: unknown) => boolean) | undefined;
```

Extension hook: protected; available to subclasses.

Inherited from `getSkinPartValidator`; shown with this receiver's substituted types.

Registers an engine-owned part field or accessor and its accepted values.
Registered accessors retain setter behavior during binding and cleanup.
Ordinary authored parts need only a type-only declare field on the host.
