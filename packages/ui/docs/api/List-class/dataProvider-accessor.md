# dataProvider

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
get dataProvider(): ICollection | undefined;
set dataProvider(value: ICollection | undefined);
```

Inherited from `dataProvider`; shown with this receiver's substituted types.

Borrowed observable collection, initially undefined. Changing it removes the
old collection listener and queues renderer rebuilding. Stage removal alone
does not detach this collection subscription; assign undefined when permanently
closing the view. Data items are never disposed by the group.

Related types: [ICollection](../ICollection-interface.md).
