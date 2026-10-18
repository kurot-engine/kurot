# Resource

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
class Resource
```

Loads, groups, caches, and destroys configured resources.

**example**

```ts
import { resource, type Texture } from '@kurot/core';

await resource.loadConfig('resource.json', 'assets/');
await resource.loadGroup('preload');
const texture = resource.get<Texture>('bg.png');
```

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](Resource-class/constructor-constructor.md) |
| `addResource` | public | [open](Resource-class/addResource-method.md) |
| `destroy` | public | [open](Resource-class/destroy-method.md) |
| `destroyAll` | public | [open](Resource-class/destroyAll-method.md) |
| `destroyGroup` | public | [open](Resource-class/destroyGroup-method.md) |
| `get` | public | [open](Resource-class/get-method.md) |
| `getGroupNames` | public | [open](Resource-class/getGroupNames-method.md) |
| `hasGroup` | public | [open](Resource-class/hasGroup-method.md) |
| `hasRes` | public | [open](Resource-class/hasRes-method.md) |
| `load` | public | [open](Resource-class/load-method.md) |
| `loadConfig` | public | [open](Resource-class/loadConfig-method.md) |
| `loadGroup` | public | [open](Resource-class/loadGroup-method.md) |
| `off` | public | [open](Resource-class/off-method.md) |
| `on` | public | [open](Resource-class/on-method.md) |
| `onProgress` | public | [open](Resource-class/onProgress-method.md) |
| `registerAnalyzer` | public | [open](Resource-class/registerAnalyzer-method.md) |
