# render

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
render(displayObject: DisplayObject, buffer: WebGLRenderBuffer, matrix: Matrix): number;
```

Render `displayObject` into `buffer` and return the number of draw calls
issued. Rebuilds the instruction set when the scene structure is dirty,
otherwise patches dirty renderables in place, then executes.
The outermost pass cycles a scratch buffer after execution to restore the
root projection following any offscreen activation.

Related types: [DisplayObject](../DisplayObject-class.md), [WebGLRenderBuffer](../WebGLRenderBuffer-class.md), [Matrix](../Matrix-class.md).
