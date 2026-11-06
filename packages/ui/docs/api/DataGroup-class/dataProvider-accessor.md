# dataProvider

Package: `@kurot/ui@5.0.0`. Generated from public declarations and JSDoc.

```ts
get dataProvider(): ICollection<T> | undefined;
set dataProvider(value: ICollection<T> | undefined);
```

Borrowed observable collection, initially undefined. Changing it removes the
old collection listener and queues renderer rebuilding. Stage removal alone
does not detach this collection subscription; assign undefined when permanently
closing the view. Data items are never disposed by the group.

Related types: [ICollection](../ICollection-interface.md).
