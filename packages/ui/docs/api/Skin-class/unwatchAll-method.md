# unwatchAll

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
unwatchAll(): void;
```

Unwatch and clear the registered $watchers list. Component calls this when the
skin is detached or replaced. Manually created bindings that were not registered
in that list, application listeners and shared textures require separate cleanup;
removing the host from the stage alone does not detach the skin.
