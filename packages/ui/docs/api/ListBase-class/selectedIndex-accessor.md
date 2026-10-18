# selectedIndex

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
get selectedIndex(): number;
set selectedIndex(value: number);
```

Selected 0-based logical item index; initially -1 for no selection. Assignment
queues selection validation and does not dispatch a user CHANGE event. Use
validateNow() on an attached list if visual selection must update immediately.
