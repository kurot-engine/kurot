# getRendererAt

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
protected getRendererAt(index: number): ItemRenderer<string> | undefined;
```

Extension hook: protected; available to subclasses.

Get the renderer at the given index, if one exists.
Used by subclasses (e.g. ListBase) to update renderer state.

Related types: [ItemRenderer](../ItemRenderer-class.md).
