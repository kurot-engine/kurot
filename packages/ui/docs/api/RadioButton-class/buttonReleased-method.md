# buttonReleased

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
protected buttonReleased(): void;
```

Extension hook: protected; available to subclasses.

Interactive tap: toggle `selected` (syncs the group with no Change via
the setter), then dispatch `Event.CHANGE` on the group — reserved for
interaction, not programmatic selection.
