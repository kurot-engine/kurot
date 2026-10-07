# Resource Manager

## Overview

Kurot's resource manager is an asynchronous loading and caching system adapted
from Egret RES. It provides:

- **async/await API** — loading operations return promises.
- **Type safety** — the `ResourceType` enum and generic `get<T>()` API.
- **Configuration-driven loading** — support for Egret `resource.json` files.
- **Group loading** — concurrency control (2 concurrent loads by default) and
  automatic retries (3 retries by default).
- **Extensibility** — custom analyzers for additional resource types.
- **Shared font kernel** — FontAnalyzer parses descriptors through
  `@kurot/bitmap-font`; loading uses Core's `net/` and `events/` modules.

## Directory structure

```
packages/core/src/kurot/resource/
├── index.ts              — public exports
├── Resource.ts           — resource manager and shared instance
├── ResourceConfig.ts     — resource configuration parsing
├── ResourceLoader.ts     — queued loading, concurrency and retries
├── ResourceItem.ts       — resource items and the ResourceType enum
├── ResourceEvent.ts      — resource event types
└── analyzers/
    ├── index.ts
    ├── AnalyzerBase.ts   — analyzer base class
    ├── ImageAnalyzer.ts  — image → Texture
    ├── JsonAnalyzer.ts   — JSON file → object
    ├── TextAnalyzer.ts   — plain text → string
    ├── SoundAnalyzer.ts  — audio → HTMLAudioElement
    ├── FontAnalyzer.ts   — font descriptor + image → BitmapFont
    └── SheetAnalyzer.ts  — sprite-sheet JSON + image → SpriteSheet
```

## Quick start

### 1. Prepare a configuration file

```json
// resource.json
{
	"resources": [
		{ "name": "bg", "type": "image", "url": "assets/bg.png" },
		{ "name": "config", "type": "json", "url": "config.json" },
		{ "name": "hero", "type": "sheet", "url": "hero.json" }
	],
	"groups": [
		{ "name": "preload", "keys": "bg,config" },
		{ "name": "game", "keys": "hero" }
	]
}
```

### 2. Load and use resources

```typescript
import { resource, ResourceType } from '@kurot/core';

// Load the configuration.
await resource.loadConfig('resource.json', 'assets/');

// Load a resource group.
await resource.loadGroup('preload');

// Read a cached resource with a generic result type.
const texture = resource.get<Texture>('bg');

// Load a single resource asynchronously.
const data = await resource.load<object>('config');

// Track this group's loading progress.
await resource.loadGroup('game', 0, (loaded, total) => {
	console.log(`Progress: ${loaded}/${total}`);
});
```

## API reference

### Resource

#### Configuration

| Method                     | Description                                                    |
| -------------------------- | -------------------------------------------------------------- |
| `loadConfig(url, folder?)` | Load and parse resource.json; `folder` prefixes resource URLs. |
| `addResource(def)`         | Add a resource definition `{ name, url, type }` dynamically.   |

#### Loading

| Method                                    | Description                                                       |
| ----------------------------------------- | ----------------------------------------------------------------- |
| `loadGroup(name, priority?, onProgress?)` | Load a group and return a promise; skip resources already loaded. |
| `load<T>(name)`                           | Load a single resource and return its cached data.                |

#### Cache and lookup

| Method            | Description                                                              |
| ----------------- | ------------------------------------------------------------------------ |
| `get<T>(name)`    | Read a cached resource synchronously; return `undefined` if unavailable. |
| `hasRes(name)`    | Check whether a resource is cached by an analyzer.                       |
| `hasGroup(name)`  | Check whether a group exists.                                            |
| `getGroupNames()` | Return all group names.                                                  |

#### Destruction

| Method               | Description                                     |
| -------------------- | ----------------------------------------------- |
| `destroy(name)`      | Destroy a resource and release its cached data. |
| `destroyGroup(name)` | Destroy all resources in a group.               |
| `destroyAll()`       | Destroy all loaded resources.                   |

#### Events

| Method                 | Description                                             |
| ---------------------- | ------------------------------------------------------- |
| `on(type, listener)`   | Listen for a resource event.                            |
| `off(type, listener)`  | Remove an event listener.                               |
| `onProgress(callback)` | Register a progress listener `(loaded, total) => void`. |

#### Extension

| Method                             | Description                                      |
| ---------------------------------- | ------------------------------------------------ |
| `registerAnalyzer(type, analyzer)` | Register an analyzer for a custom resource type. |

### ResourceType

| Value     | Description                                   |
| --------- | --------------------------------------------- |
| `'image'` | Image resource producing a `Texture`.         |
| `'json'`  | JSON file parsed as an `object`.              |
| `'text'`  | Plain-text file returned as a `string`.       |
| `'sound'` | Audio file returned as an `HTMLAudioElement`. |
| `'sheet'` | Sprite sheet returned as a `SpriteSheet`.     |
| `'font'`  | Bitmap font returned as a `BitmapFont`.       |

### ResourceEventType

| Event               | Trigger                                   |
| ------------------- | ----------------------------------------- |
| `CONFIG_COMPLETE`   | Configuration loading completes.          |
| `CONFIG_LOAD_ERROR` | Configuration loading fails.              |
| `GROUP_COMPLETE`    | All resources in a group finish loading.  |
| `GROUP_PROGRESS`    | A resource in the group finishes loading. |
| `GROUP_LOAD_ERROR`  | A resource in the group fails to load.    |
| `ITEM_LOAD_ERROR`   | A single resource fails to load.          |

### ResourceEvent

```typescript
interface ResourceEvent {
	type: ResourceEventType;
	groupName: string;
	item?: ResourceItem;
	itemsLoaded: number;
	itemsTotal: number;
}
```

## Built-in analyzers

### ImageAnalyzer

Load an image and create a `Texture`. Destruction calls `texture.dispose()`.

```typescript
const texture = resource.get<Texture>('bg');
// Use the texture with a Bitmap display object.
```

### JsonAnalyzer

Load a JSON file through `HttpRequest` and parse it into an object.

```typescript
const config = resource.get<Record<string, unknown>>('config');
```

### TextAnalyzer

Load a plain-text file through `HttpRequest`.

```typescript
const text = resource.get<string>('readme');
```

### FontAnalyzer (2.2.0)

Load a font descriptor and its image page, resolved relative to the descriptor,
and return a `BitmapFont`. Supported formats are Egret JSON `.fnt`, native JSON
and single-page, unpacked BMFont text. Concurrent requests for the same font share
one load. Destroying the font releases its internal page; a separately configured
PNG resource retains independent ownership. Display objects borrow the font, so
removing text does not destroy it. See [bitmap fonts](bitmap-fonts.md) for formats,
texture restrictions and lifecycle contracts.

```typescript
import { BitmapFont, resource } from '@kurot/core';

resource.addResource({ name: 'numbers', type: 'font', url: 'assets/number_font.fnt' });
const font = await resource.load<BitmapFont>('numbers');
```

### SoundAnalyzer

Load an audio file and return an `HTMLAudioElement`. Destruction calls `pause()`
and releases `src`.

```typescript
const audio = resource.get<HTMLAudioElement>('bgm');
audio.play();
```

### SheetAnalyzer

Load a sprite sheet in TexturePacker JSON format in two steps:

1. Load the JSON descriptor to obtain frame data and the image path.
2. Load the image and create subtextures.

Resources can be retrieved in three ways:

```typescript
// Retrieve the complete SpriteSheet.
const sheet = resource.get<SpriteSheet>('hero');

// Retrieve a subtexture directly by its subkey name.
const frame = resource.get<Texture>('hero_idle_01');

// Retrieve a subtexture with dot notation.
const frame2 = resource.get<Texture>('hero.idle_01');
```

## Custom analyzers

Extend `AnalyzerBase` to implement a custom resource type:

```typescript
import { AnalyzerBase } from '@kurot/core';
import { ResourceItem } from '@kurot/core';

class XmlAnalyzer extends AnalyzerBase {
	public loadFile(item: ResourceItem): Promise<ResourceItem> {
		if (this.fileDic.has(item.name)) {
			item.loaded = true;
			return Promise.resolve(item);
		}

		return fetch(item.url)
			.then(res => res.text())
			.then(text => {
				const parser = new DOMParser();
				const doc = parser.parseFromString(text, 'text/xml');
				this.fileDic.set(item.name, doc);
				item.loaded = true;
				return item;
			})
			.catch(() => {
				item.loaded = false;
				return item;
			});
	}
}

// Register the analyzer.
resource.registerAnalyzer('xml', new XmlAnalyzer());
```

## Queued loading (ResourceLoader)

`ResourceLoader` is the internal queue loader. It supports:

- **Concurrency control** — `threadCount` limits simultaneous loads (default 2).
- **Automatic retries** — `retryCount` controls retries before reporting failure
  (default 3).
- **Notifications** — `onComplete`, `onError` and `onProgress` callbacks.

Applications normally use `Resource.loadGroup()` instead of accessing
`ResourceLoader` directly.

## Configuration format

### Standard format (2.0.0)

```json
{
	"resources": [
		{
			"name": "uniqueResourceName",
			"type": "image|json|text|sound|sheet|font",
			"url": "relative-or-absolute-path",
			"subkeys": { "frameName": { "scale9grid": "1,1,2,2" }, "ordinaryFrame": {} }
		}
	],
	"groups": [
		{
			"name": "groupName",
			"keys": "resource1,resource2"
		}
	]
}
```

`subkeys` is an object map. Refresh legacy sheets explicitly in the Editor before
using old string-based manifests. `scale9grid` supplies Image compilation defaults;
Core does not apply it automatically to arbitrary Bitmap objects. See the
[resource nine-slice defaults contract](../../ui-document/docs/resource-nine-slice.md).

### URL resolution

- URLs containing `://` are treated as absolute and left unchanged.
- Other URLs receive the `folder` prefix passed to `loadConfig()`.

### Creating groups dynamically

```typescript
import { resource, ResourceConfig } from '@kurot/core';

// Use ResourceConfig.createGroup for low-level group creation.
// Applications usually define groups in configuration files.
```

## Comparison with Egret RES

| Aspect               | Egret RES                 | Kurot Resource                       |
| -------------------- | ------------------------- | ------------------------------------ |
| API style            | Callback `compFunc(data)` | `async/await` and promises           |
| Modules              | Global `RES.xxx`          | ES module imports                    |
| Events               | `egret.EventDispatcher`   | Lightweight `on/off` API             |
| Type safety          | Extensive `any`           | Generic `get<T>()`                   |
| Versioning           | `VersionController`       | Handled by build tools               |
| XML parsing          | Built in                  | Handled by the KUI XML compiler      |
| Internationalization | Built in                  | Outside the resource loader's scope  |
| Analyzer types       | 8                         | 6 (Image/Json/Text/Sound/Sheet/Font) |
| Code size            | Approximately 3,000 lines | Approximately 1,400 lines            |

### Omitted features

The following legacy features are intentionally omitted:

- **VersionController** — modern build tools such as Vite/Webpack handle CDN
  versioning.
- **i18n** — internationalization is outside the resource loader's scope.
- **XML/Bin analyzers** — the compiler preprocesses KUI XML; a built-in binary
  analyzer is not included.
- **AnimationAnalyzer** — not included; a custom analyzer can provide it if needed.
- **Complex synchronous getRes() sheet-subkey lookup** — replaced by dot notation.

## Usage notes

1. **Concurrent `loadGroup` calls are queued serially.** They share one internal
   `ResourceLoader`. Calls for the same or different groups retain their own
   callbacks and promise results, but the underlying batches run sequentially.
2. **`onProgress` listeners are permanent.** For tracking a single load operation,
   use the callback parameter of `loadGroup`.
3. **Sheet subkey collisions.** Avoid duplicate subtexture names across sheets;
   later sheets do not replace an earlier sheet's subkey registration.
4. **Resource URLs require same-origin access or CORS.** Browser access rules
   apply to images and audio.
