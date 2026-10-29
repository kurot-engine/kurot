# createPlayer

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
createPlayer(options: KurotOptions): KurotApp;
```

Creates and initializes a Kurot player from the given options.
This is the main entry point for starting a Kurot application.
Use a single live application and call destroy() when its page/view closes.
Stage settings resolve per field from explicit options, then canvas data-*
attributes, then existing defaults. CLI pages can call createPlayer({ canvas }).
Invalid consumed attributes throw before Player resources are allocated.

```ts
import { createPlayer, Sprite } from '@kurot/core';

const app = createPlayer({
  canvas: document.getElementById('gameCanvas') as HTMLCanvasElement,
  contentWidth: 640,
  contentHeight: 1136,
  scaleMode: 'showAll',
  frameRate: 60,
});

const root = new Sprite();
app.start(root);
```

Related types: [KurotApp](KurotApp-interface.md), [KurotOptions](KurotOptions-interface.md).
