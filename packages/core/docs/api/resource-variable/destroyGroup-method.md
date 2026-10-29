# destroyGroup

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
destroyGroup(groupName: string): void;
```

Destroy all resources in a group.
Configuration remains registered. Shared entries are also removed for
other groups that refer to them; pending loads are not cancelled.
