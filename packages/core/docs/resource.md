# 资源管理器 (Resource Manager)

## 概述

Kurot 资源管理器是从 Egret RES 模块现代化迁移而来的异步资源加载与缓存系统。它提供：

- **async/await API** — 所有加载操作返回 Promise
- **类型安全** — `ResourceType` 枚举 + 泛型 `get<T>()`
- **配置驱动** — 兼容 Egret `resource.json` 格式
- **按组加载** — 并发控制（默认 2 线程）、自动重试（默认 3 次）
- **可扩展** — 自定义 Analyzer 支持新资源类型
- **零外部依赖** — 仅依赖 core 内部的 `net/` 和 `events/`

## 目录结构

```
packages/core/src/kurot/resource/
├── index.ts              — 统一导出
├── Resource.ts           — 资源管理器主类（单例 + 便捷实例）
├── ResourceConfig.ts     — 配置文件解析
├── ResourceLoader.ts     — 队列加载器（并发 + 重试）
├── ResourceItem.ts       — 资源项定义 + ResourceType 枚举
├── ResourceEvent.ts      — 事件类型定义
└── analyzers/
    ├── index.ts
    ├── AnalyzerBase.ts   — 解析器抽象基类
    ├── ImageAnalyzer.ts  — 图片 → Texture
    ├── JsonAnalyzer.ts   — JSON 文件 → object
    ├── TextAnalyzer.ts   — 纯文本 → string
    ├── SoundAnalyzer.ts  — 音频 → HTMLAudioElement
    └── SheetAnalyzer.ts  — 精灵表 JSON + 图片 → SpriteSheet
```

## 快速开始

### 1. 准备配置文件

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

### 2. 加载与使用

```typescript
import { resource, ResourceType } from '@kurot/core';

// 加载配置
await resource.loadConfig('resource.json', 'assets/');

// 按组加载
await resource.loadGroup('preload');

// 获取缓存的资源（泛型）
const texture = resource.get<Texture>('bg');

// 异步加载单个资源
const data = await resource.load<object>('config');

// 监听加载进度
await resource.loadGroup('game', 0, (loaded, total) => {
	console.log(`进度: ${loaded}/${total}`);
});
```

## API 参考

### Resource 主类

#### 配置

| 方法                       | 说明                                               |
| -------------------------- | -------------------------------------------------- |
| `loadConfig(url, folder?)` | 加载并解析 resource.json，`folder` 为资源 URL 前缀 |
| `addResource(def)`         | 动态添加资源定义 `{ name, url, type }`             |

#### 加载

| 方法                                      | 说明                                         |
| ----------------------------------------- | -------------------------------------------- |
| `loadGroup(name, priority?, onProgress?)` | 按组加载，返回 Promise。已加载的资源自动跳过 |
| `load<T>(name)`                           | 异步加载单个资源，返回缓存数据               |

#### 缓存

| 方法              | 说明                                     |
| ----------------- | ---------------------------------------- |
| `get<T>(name)`    | 同步获取缓存资源，未加载返回 `undefined` |
| `hasRes(name)`    | 检查资源是否已缓存                       |
| `hasGroup(name)`  | 检查组是否存在                           |
| `getGroupNames()` | 获取所有组名                             |

#### 销毁

| 方法                 | 说明                   |
| -------------------- | ---------------------- |
| `destroy(name)`      | 销毁单个资源，释放缓存 |
| `destroyGroup(name)` | 销毁整组资源           |
| `destroyAll()`       | 销毁所有已加载资源     |

#### 事件

| 方法                   | 说明                                   |
| ---------------------- | -------------------------------------- |
| `on(type, listener)`   | 监听资源事件                           |
| `off(type, listener)`  | 移除事件监听                           |
| `onProgress(callback)` | 便捷进度监听 `(loaded, total) => void` |

#### 扩展

| 方法                               | 说明                     |
| ---------------------------------- | ------------------------ |
| `registerAnalyzer(type, analyzer)` | 注册自定义资源类型解析器 |

### ResourceType 枚举

| 值        | 说明                              |
| --------- | --------------------------------- |
| `'image'` | 图片资源，生成 `Texture`          |
| `'json'`  | JSON 文件，解析为 `object`        |
| `'text'`  | 纯文本文件，返回 `string`         |
| `'sound'` | 音频文件，返回 `HTMLAudioElement` |
| `'sheet'` | 精灵表，返回 `SpriteSheet`        |

### ResourceEventType 事件类型

| 事件                | 触发时机                 |
| ------------------- | ------------------------ |
| `CONFIG_COMPLETE`   | 配置文件加载完成         |
| `CONFIG_LOAD_ERROR` | 配置文件加载失败         |
| `GROUP_COMPLETE`    | 资源组全部加载完成       |
| `GROUP_PROGRESS`    | 资源组中单个资源加载完成 |
| `GROUP_LOAD_ERROR`  | 资源组中有资源加载失败   |
| `ITEM_LOAD_ERROR`   | 单个资源加载失败         |

### ResourceEvent 接口

```typescript
interface ResourceEvent {
	type: ResourceEventType;
	groupName: string;
	item?: ResourceItem;
	itemsLoaded: number;
	itemsTotal: number;
}
```

## 内置解析器

### ImageAnalyzer

加载图片并创建 `Texture` 对象。销毁时自动调用 `texture.dispose()`。

```typescript
const texture = resource.get<Texture>('bg');
// texture 可直接用于 Bitmap 显示对象
```

### JsonAnalyzer

通过 `HttpRequest` 加载 JSON 文件并解析为对象。

```typescript
const config = resource.get<Record<string, unknown>>('config');
```

### TextAnalyzer

通过 `HttpRequest` 加载纯文本文件。

```typescript
const text = resource.get<string>('readme');
```

### SoundAnalyzer

加载音频文件，返回 `HTMLAudioElement`。销毁时自动 `pause()` 并释放 `src`。

```typescript
const audio = resource.get<HTMLAudioElement>('bgm');
audio.play();
```

### SheetAnalyzer

加载精灵表（TexturePacker JSON 格式），两步加载：

1. 加载 JSON 配置获取帧信息和图片路径
2. 加载关联图片，切割为子纹理

支持三种获取方式：

```typescript
// 获取整个 SpriteSheet
const sheet = resource.get<SpriteSheet>('hero');

// 通过子键名直接获取子纹理
const frame = resource.get<Texture>('hero_idle_01');

// 通过点号语法获取
const frame2 = resource.get<Texture>('hero.idle_01');
```

## 自定义解析器

继承 `AnalyzerBase` 实现自定义资源类型：

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

// 注册
resource.registerAnalyzer('xml', new XmlAnalyzer());
```

## 队列加载器 (ResourceLoader)

`ResourceLoader` 是内部使用的队列加载器，支持：

- **并发控制** — `threadCount`（默认 2）限制同时加载数
- **自动重试** — `retryCount`（默认 3）次重试后报告失败
- **回调通知** — `onComplete` / `onError` / `onProgress`

通常不需要直接使用 `ResourceLoader`，通过 `Resource.loadGroup()` 即可间接使用。

## 配置文件格式

### 标准格式（兼容 Egret）

```json
{
	"resources": [
		{
			"name": "资源唯一标识",
			"type": "image|json|text|sound|sheet",
			"url": "相对或绝对路径",
			"subkeys": "逗号分隔的子键（仅 sheet 类型使用）"
		}
	],
	"groups": [
		{
			"name": "组名",
			"keys": "逗号分隔的资源名称"
		}
	]
}
```

### URL 解析规则

- 包含 `://` 的 URL 视为绝对路径，不做处理
- 其他 URL 会在前面拼接 `loadConfig()` 的 `folder` 参数

### 动态创建组

```typescript
import { resource, ResourceConfig } from '@kurot/core';

// 通过 ResourceConfig 的 createGroup 方法
// 注意：这是底层 API，通常通过配置文件定义组
```

## 与 Egret RES 的对比

| 维度       | Egret RES               | Kurot Resource                      |
| ---------- | ----------------------- | ----------------------------------- |
| API 风格   | 回调 `compFunc(data)`   | `async/await` + Promise             |
| 模块化     | 全局 `RES.xxx`          | ES Module 导入                      |
| 事件系统   | `egret.EventDispatcher` | 轻量 `on/off` 模式                  |
| 类型安全   | 大量 `any`              | 泛型 `get<T>()`                     |
| 版本控制   | `VersionController`     | 剔除（构建工具处理）                |
| XML 解析   | 内置                    | 剔除（EXML compiler 处理）          |
| 国际化     | 内置                    | 剔除（不属于资源加载器职责）        |
| 解析器类型 | 8 种                    | 5 种（Image/Json/Text/Sound/Sheet） |
| 代码量     | ~3,000 行               | ~1,400 行                           |

### 剔除的功能

以下旧版功能被有意剔除：

- **VersionController** — CDN 版本控制由现代构建工具（Vite/Webpack）处理
- **i18n 国际化** — 不属于资源加载器的职责
- **XML/Bin 分析器** — EXML 由 compiler 预处理，Binary 格式初期不需要
- **AnimationAnalyzer** — 初期不需要，后续按需添加
- **FontAnalyzer** — 初期不需要，后续按需添加
- **同步 getRes() 的复杂 sheet 子键查找** — 简化为点号语法

## 注意事项

1. **并发 `loadGroup` 调用会排队串行执行** — 内部共享一个 `ResourceLoader` 实例，同时调用多个 `loadGroup`（同组或不同组）不会互相覆盖回调或丢失进度；每次调用仍各自独立 resolve/reject，只是底层批次按调用顺序依次执行，不会真正并行加载。

2. **`onProgress` 监听器不会自动移除** — 每次 `onProgress()` 调用会添加一个永久监听器。如需一次性监听，请使用 `loadGroup` 的 `onProgress` 参数。

3. **Sheet 子键冲突** — 不同精灵表的子纹理名称不应重复，后加载的不会覆盖先加载的同名子键。

4. **资源 URL 需要同源或 CORS** — 图片和音频加载受浏览器同源策略限制。
