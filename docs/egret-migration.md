# 从 Egret 迁移到 Kurot

本文档是面向 Egret 项目的**全面对比与迁移指南**，集中说明 Kurot 与 Egret 的差异、
Breaking Changes 以及迁移方式。各包的 `docs/architecture.md` 只描述 Kurot 当前的架构
与机制，不再包含对比内容——对比统一收拢在这里。

> 本文档随 Kurot 演进。具体某个 API/行为是否已实现，以对应包的 `docs/architecture.md`
> 与 `docs/ai-context.md` 为准。

---

## 一、整体差异概览

| 维度 | Egret | Kurot |
| --- | --- | --- |
| 模块系统 | `namespace egret` / 全局变量 | ES Module（`@kurot/*` npm 包） |
| 类型系统 | `strict` 未开启，大量 `any` | `strict: true`，全量类型安全，零 `any` |
| 编译目标 | ES5/ES3 | ES2022，仅支持现代浏览器 |
| 渲染架构 | RenderNode 三阶段 | InstructionSet 指令驱动（借鉴 Pixi.js 8） |
| 批处理 | 同纹理合并 | 多纹理批处理（8 张/批） |
| 包管理 | monolith，无 package.json | `@kurot/*` workspace 包，pnpm |
| 资源管理 | 无独立模块 | Resource 完整资源生命周期 |
| WebGL | 仅 WebGL 1 | WebGL 1 + WebGL 2 双后端，自动选择 |

---

## 二、架构级变更（渲染管线）

### 2.1 渲染管线设计点

| 设计点 | Egret RenderNode | Kurot InstructionSet |
| --- | --- | --- |
| 中间表示 | RenderNode 树 | 扁平 Instruction 数组 |
| 缓存粒度 | 每个 DisplayObject 一个 Node | 整棵树 / RenderGroup 一个 Set |
| 脏检查 | `$renderDirty` 跳过子树重建 | `structureDirty` 全量重建 / `renderDirty` 局部更新 |
| 分发方式 | `node.type` switch | `renderPipeId` 字符串分发 |
| 批处理 | 同纹理合并 | 多纹理批处理（8 张/批） |

#### 为什么这么改

旧架构每帧都要遍历整棵场景图，且每个 DisplayObject 都有一个与之对应的 RenderNode 要更新；
即使内容完全没变，这趟 JS 遍历也得照走，开销随对象总数线性增长。InstructionSet 把"构建"和"执行"
拆成两阶段：结构变化时才重建指令集，执行阶段只对扁平指令数组做线性分发，不再走场景图；进一步用
RenderGroup 把静态子树隔离进独立指令集，让"从不变化的背景"在每帧的 JS 遍历里成本为零，只有真正
变动的对象才触发 `renderDirty` 局部 patch。

#### 具体例子

- **静态背景 + 少量动画**：一张含几十个装饰节点的背景层包裹进 `isRenderGroup = true` 的容器，同屏还有
  两个动画角色。旧架构每帧都要遍历背景的全部节点；新架构背景的 InstructionSet 只在结构变化时构建一次，
  每帧零 JS 遍历，执行阶段直接复用——每帧的 JS 工作量近似只跟两个角色挂钩，跟背景对象总数无关。
- **只改位置不重建**：角色移动只触发 `renderDirty`，通过 `renderableIndex` 映射 O(1) 定位到它的指令槽
  更新 transform 快照，不重建整个指令集。

#### 取舍说明

- **扁平数组 vs RenderNode 树**：扁平指令数组的优势是线性遍历、缓存友好，且没有与场景图一一对应的 Node 对象开销；代价是**拓扑变化（增删/重排子节点）需要重建整个 InstructionSet**，而不是像树那样局部改一个 Node。Kurot 用下面两级脏标记 + RenderGroup 隔离来摊薄这个代价。
- **整树/RenderGroup 粒度 + 两级脏标记**：把视觉数据变化（位置/透明度/纹理）和结构变化分开——只有 `renderDirty` 时走 O(1) 局部 patch（通过 `renderableIndex` 映射直接定位指令槽），不重建；只有 `structureDirty`（结构变了）才全量重建。相比 Egret 逐 Node 的 `$renderDirty`，Kurot 的重建粒度更粗，但 `RenderGroup` 可以把频繁变动的子树隔离进独立 Set，让重建只发生在子树内部、不污染父级。
- **renderPipeId 字符串分发 vs `node.type` switch**：以字符串标识路由到对应 Pipe，换来的是**可扩展性**（第三方能注册自己的 Pipe/渲染对象类型）与渲染逻辑和显示对象的解耦；代价是一次字符串查表（热路径上可忽略）。
- **多纹理批处理 vs 同纹理合并**：一个 draw call 绑定多张纹理，在唯一纹理数量多的场景显著减少 draw call；代价是顶点格式变大（stride 20B → 24B，多一个 `aTextureId`）、需要槽位管理，且超过 8 个槽位、或遇到 mesh/filter/blend 变化时会自动 flush 回退到单纹理路径。

### 2.2 多纹理批处理

```
旧 Egret：纹理切换 = 打断批处理
  Bitmap A (tex1) → drawCall 1
  Bitmap B (tex2) → drawCall 2
  Bitmap C (tex1) → drawCall 3

Kurot：一个 drawCall 绑定多张纹理
  Bitmap A (tex1, slot 0) ─┐
  Bitmap B (tex2, slot 1)  ├→ drawCall 1
  Bitmap C (tex1, slot 0) ─┘
```

`MultiTextureBatcher` 管理最多 8 个纹理槽位（WebGL1 最小保证纹理单元数）；顶点格式增加
`aTextureId` float 属性（stride 从 20B 增至 24B）；fragment shader 用 if/else 链采样
（WebGL1 兼容）。mesh、filter、blend 变化会自动 flush 回退到单纹理路径。

#### 为什么这么改

Draw call 的开销主要在 CPU 侧的状态切换与驱动提交，而不是 GPU 填充。一个 HUD 或背包界面里
常常是十几张各自独立的小纹理（图标、徽章、边框），它们大多只是纯 quad。在旧的"同纹理合并"下，
相邻两个不同纹理就打断批处理，于是 N 张独立纹理 = N 个 draw call；更麻烦的是，要把它压到 1 个
draw call 就得把它们拼进同一张图集，而图集有尺寸上限、也不能容纳运行时动态加载的碎片资源。

多纹理批处理把"必须同纹理才能合批"放宽成"同一批内纹理数 ≤ 8 即可合批"，让独立纹理不再强制打散
批次，也不再强制要求美术把它们做成一张图集。

#### 具体例子

- **收益场景**：背包面板里 6 个不同道具图标 + 2 个品质边框 = 8 张独立纹理，都是纯 Bitmap。
  旧方案 8 个 draw call；新方案占满 8 个槽位，1 个 draw call。
- **部分回退**：上述 8 个里有一个图标挂了 GlowFilter。filter 走独立的离屏 FBO pass，会打断
  多纹理批——这个图标单独 flush，其余 7 个仍合成 1 个 draw call（外加 filter pass 的开销）。
- **超槽回退**：9 张独立纹理时，第 9 张触发 `getOrAssignSlot` 返回 -1 → flush，前 8 个一个
  draw call、第 9 个起新批次。draw call 数 ≈ ⌈纹理数 / 8⌉，不是线性 N。

#### 收益

- **唯一纹理多时 draw call 显著下降**（最理想 8→1），CPU 侧提交开销随之降低。
- **不再依赖单图集合批**，资源管线更灵活，能容纳动态加载的碎片纹理。
- **对开发者透明**：纯 quad 的 Bitmap 自动走多纹理路径，无需手动配置。

#### 风险与代价

- **顶点带宽 +20%**：多纹理批次里每个顶点 24B 而非 20B（多一个 `aTextureId`），即使该批次
  实际只用 1 张纹理也一样——这是无条件付出的固定成本。
- **shader 更复杂**：fragment 端是 8 路 if/else 采样 + sampler 数组，片段着色成本略高于单纹理。
- **槽位上限 8**：`MAX_TEXTURES` 硬编码为 8（WebGL1 最小保证值）。纹理数远超 8 时仍会反复 flush，
  不能指望它消除所有 draw call。WebGL2 设备实际支持 16+ 却被卡在 8——这是
  [pixi-alignment.md](../packages/core/docs/pixi-alignment.md) 里 P1-1 待优化的点。
- **槽位分配是贪心的**：`getOrAssignSlot` 按到达顺序占槽，绘制顺序不佳时会比理论值多 flush 几次。
- **静默回退易误判**：filter / mesh（含 Spine、MovieClip）/ blend 变化都会悄悄打断批，开发者可能
  以为在合批实则没有。判断真实 draw call 数应看 `Player.perf`，不能凭直觉。
- **收益与场景强相关**：若界面本就是单图集（一张纹理），新旧方案都是 1 个 draw call，多纹理批
  带不来收益却仍付出 24B stride 的代价。它的价值只在"多张独立纹理"时兑现。

### 2.3 其他架构级变更

- RenderNode 中间层 → InstructionSet 指令驱动，12 个 nodes/paths 文件移除。
- Graphics 从 `sys.GraphicsNode` + `sys.Path2D` → `GraphicsCommand[]` 扁平命令数组。
- "接口 + Web 实现 + Native 实现"三文件模式合并为单一实现，每模块减少 60–85% 代码。
- Native 渲染路径（`egret.nativeRender`、`egret_native.*`）全部移除。
- 全局变量（`global.egret`）→ ES Module 导入。
- `$field` / `$method()` → `private _field` / `@internal`。
- 移除遗留代码：bind polyfill、手写 UTF-8、IE 兼容、vendor 前缀、typescript-plus 等。
- WebGL 2 支持：双着色器库（GLSL ES 1.00 + 3.00），运行时自动选择。
- `RenderObjectType` 枚举替代 instanceof，热路径零开销类型路由。
- 单 Player 设计：`Player` 直接赋值静态钩子字段（`$onStructureChange` 等）。

---

## 三、运行时 API 对比与 Breaking Changes

### 3.1 显示对象 API

| Egret API | 状态 |
| --- | --- |
| `x/y/scaleX/scaleY/rotation/alpha/visible/touchEnabled` | ✅ 完全一致 |
| `anchorOffsetX/Y` | ✅ 完全一致 |
| `width/height` | ⚠️ 行为变更：使用 explicitWidth/Height 模式 |
| `mask` (DisplayObject/Rectangle) / `scrollRect` | ✅ 完全一致 |
| `cacheAsBitmap` / `filters` | ✅ 完全一致 |
| `getBounds()` / `globalToLocal()` / `localToGlobal()` / `hitTestPoint()` | ✅ 完全一致 |
| `addChild/removeChild/swapChildren/setChildIndex` | ✅ 完全一致 |
| `getChildAt` | ⚠️ 越界返回 `undefined`（Egret 可能抛异常） |
| `removeChildAt` | ⚠️ 越界返回 `undefined`（Egret 可能抛异常） |
| `removeChildren` | ⚠️ 返回 `void`（Egret 返回数组） |
| `bitmap.texture/smoothing/fillMode/scale9Grid/pixelHitTest` | ✅ 完全一致 |
| `bitmap.width/height` | ⚠️ 使用 explicitBitmapWidth/Height 模式 |
| `mesh.vertices/indices/uvs` | ✅ 完全一致 |
| `graphics.beginFill/lineStyle/drawRect/drawCircle/...` | ✅ 完全一致 |
| `stage.stageWidth/stageHeight/frameRate/scaleMode/orientation` | ✅ 完全一致 |
| `blendMode` | ⚠️ 值从 `"normal"` 改为 `"source-over"` |
| `matrix` getter | ⚠️ 返回 clone（Egret 返回引用） |

### 3.2 Kurot 新增 API（Egret 无对应）

| 属性/方法 | 说明 |
| --- | --- |
| `displayObject.tint` | 着色（0xRRGGBB） |
| `displayObject.zIndex` / `sortableChildren` | 排序 |
| `displayObject.skewX/skewY` | 斜切变换 |
| `displayObject.measuredWidth/measuredHeight` | 内容测量尺寸（只读） |
| `container.isRenderGroup` | 独立渲染组标记 |
| `graphics.drawArc()` | 原生弧线绘制 |
| `graphics.lineStyle(..., lineDash?)` | 虚线参数 |
| `CustomFilter` | 自定义 WebGL 着色器滤镜 |
| `EventDispatcher.once()` | 一级公开方法 |
| `Player.perf` | 性能指标（fps/drawCalls 等） |
| `createPlayer(options)` | 统一创建入口 |
| `RenderObjectType` enum | 快速类型路由（替代 instanceof） |
| `tokenize()` / `splitGraphemes()` | 文本分词/字素分割 |
| `measureText()` / `getFontString()` | 文本测量/字体字符串构建 |

### 3.3 事件系统

11 个事件类 + `EventPhase` 枚举 + `IEventDispatcher` 接口，导出名称与 Egret 一致。内部
优化：存储改为 `Map`，对象池改为 `WeakMap`，移除 `thisObject` 参数。

事件类列表：`Event`, `EventPhase`, `FocusEvent`, `HTTPStatusEvent`, `IOErrorEvent`,
`ProgressEvent`, `StageOrientationEvent`, `TextEvent`, `TimerEvent`, `TouchEvent`,
`IEventDispatcher`。

### 3.4 其他模块

| 模块 | 状态 | 差异说明 |
| --- | --- | --- |
| geom (Matrix/Point/Rectangle) | ✅ API 兼容 | 对象池 `create()/release()` |
| filters (Blur/Glow/DropShadow/ColorMatrix) | ✅ API 兼容 | |
| filters (CustomFilter) | 🆕 全新 | 自定义 WebGL 着色器滤镜 |
| net (HttpRequest/ImageLoader) | ✅ API 兼容 | |
| media (Sound/SoundChannel/Video) | ✅ API 兼容 | |
| text (TextField/BitmapText/BitmapFont) | ✅ API 兼容 | |
| text (HtmlTextParser/InputController) | 🆕 全新 | HTML 解析 + 输入控制 |
| text (WordWrap/TextMeasurer) | 🆕 全新 | 自动换行 + 文本测量 |
| localStorage | ✅ API 兼容 | |
| ExternalInterface | ✅ API 兼容 | |
| utils (ByteArray/Timer) | ✅ API 兼容 | 不提供 `HashObject`/`.hashCode` |
| utils (Base64Util/NumberUtils/DebugLog) | 🆕 全新 | 编码/数学/调试工具 |
| Resource | 🆕 全新 | 完整资源生命周期管理 |
| Capabilities | 🆕 全新 | 运行时环境能力检测 |

### 3.5 Breaking Changes 速查

| 变更 | 影响 | 迁移方式 |
| --- | --- | --- |
| `thisObject` 参数移除 | 所有事件监听代码 | 使用箭头函数 |
| `BlendMode` 值变化 | `"normal"` → `"source-over"` | 使用常量 |
| `width/height` 行为变更 | Egret 通过 scaleX/scaleY 模拟 | 使用 explicitWidth/Height 或直接设 scaleX/scaleY |
| `matrix` getter 返回 clone | 依赖引用修改 matrix 的代码 | 改用 `setMatrix()` |
| `removeChildren()` 返回值 | `DisplayObject[]` → `void` | 不依赖返回值 |
| `getChildAt()` 越界 | 抛异常 → 返回 `undefined` | 检查返回值 |
| hitTest 返回值 | `null` → `undefined` | 检查 `=== null` |
| 命名空间 | `egret.xxx` → ES Module | 全量替换 |
| `Texture.getPixel32/getPixels/toDataURL` | 已废弃 | 仅 `RenderTexture.getPixel32` 可用 |
| `Base64Util.encode` 签名 | `string` → `ArrayBuffer` | `encode(new TextEncoder().encode(str))` |
| `HashObject` / `IHashObject` / `.hashCode` 移除 | 依赖整数哈希做对象身份比较的代码 | 用 `===` 或 `WeakMap` 键控查找 |
| `Resource.instance` 单例 getter 移除 | 通过 `Resource.instance` 访问单例的代码 | `import { resource } from '@kurot/core'` |
| 多 Player 监听器注册 API 移除 | `addStructureChangeListener` 等 | 该 API 从未被实际使用，无需迁移 |
| `WebGLRenderContext.getInstance()`/`resetInstance()` 移除 | 依赖单例访问 WebGL 上下文的代码 | `Player` 直接持有 context 实例 |
| `experimental-webgl` / `webkitAudioContext` / vendor 前缀全屏 API 移除 | 依赖旧浏览器前缀降级的代码 | 无需迁移，现代浏览器均支持标准 API |

---

## 四、扩展模块差异（`@kurot/game`）

| 模块 | Egret 行为 | Kurot 行为 |
| --- | --- | --- |
| Tween | 通常由第三方库（如 CreateJS TweenJS）提供，无官方内置 | 内置，`repeat` 语义是"额外周期数"而非"总次数" |
| MovieClip | 内部持有 ticker，`play()` 后自驱动 | 不持有 ticker，必须外部调用 `advanceFrame()` |
| ScrollView | EUI `Scroller` 组件驱动 | 独立的 `ScrollView` 类，非 UI 组件树的一部分 |
| ParticleSystem | 无内置实现 | 内置模板方法基类 + Particle-Designer 风格实现 |
| URLLoader | callback 风格，`data` 类型随 `dataFormat` 变化 | 事件驱动，`data` 类型语义保持一致 |

---

## 五、命令行与构建迁移（`@kurot/cli`）

### 5.1 命令对照

| Egret | Kurot | 说明 |
| --- | --- | --- |
| `egret create <name>` | `kurot create <name>` | 创建项目 |
| `egret build` | `kurot build` | 开发构建 |
| `egret startserver` / `egret run` | `kurot dev` | 构建并启动开发服务器 |
| `egret clean` | `kurot clean` | 清理输出目录 |
| `egret publish` | `kurot build --release` | 生成压缩、带 hash 的发布产物 |
| `egret upgrade` | 更新 `package.json` 后运行 `pnpm install` | 通过 npm 包管理版本 |

Kurot release 不是单文件：应用、引擎、主题和自定义 namespace 分别生成 ESM chunk，由
import map 连接。

常用附加选项：

| 选项 | 命令 | 说明 |
| --- | --- | --- |
| `--watch` | `kurot build` | 监听源码并使用开发模式重编译 |
| `--analyze` | `kurot build` | 分析 release 应用 bundle |
| `--sourcemap` | `build` / `dev` | 生成 sourcemap |
| `-p, --port` | `kurot dev` | 指定端口，默认 `3000` |
| `--template` | `kurot create` | `game` 或 `empty` |

### 5.2 配置迁移

Egret 的 `egretProperties.json` 和 HTML `data-*` 设置统一迁移到 `kurot.config.ts`：

```ts
export default {
	target: 'html5',
	entry: 'src/Main.ts',
	output: { dir: 'bin-debug' },
	stage: {
		width: 640,
		height: 1136,
		scaleMode: 'showAll',
		orientation: 'auto',
		frameRate: 60,
		background: '#000000',
	},
	exml: {
		themeFile: 'resource/default.thm.json',
	},
};
```

| Egret | Kurot | 说明 |
| --- | --- | --- |
| `modules` | `package.json` dependencies | 运行时模块改为 npm 包 |
| `target.current: "web"` | `target: "html5"` | 当前仅支持 HTML5 |
| 入口类/脚本配置 | `entry` | 默认 `src/Main.ts` |
| `data-content-width` | `stage.width` | 舞台宽度 |
| `data-content-height` | `stage.height` | 舞台高度 |
| `data-scale-mode` | `stage.scaleMode` | 缩放模式 |
| `data-orientation` | `stage.orientation` | 屏幕方向 |
| `data-frame-rate` | `stage.frameRate` | 帧率 |
| HTML/CSS 背景 | `stage.background` | 页面背景色 |
| — | `output.dir` | development 输出目录 |
| 主题配置 | `exml.themeFile` | 主题 JSON 路径 |
| 自定义 EXML 包 | `exml.namespaces` | prefix 到 barrel file 的映射 |

### 5.3 模块与入口代码迁移

| Egret 模块 | Kurot 包 | 示例能力 |
| --- | --- | --- |
| `egret` | `@kurot/core` | `Sprite`、`TextField`、事件和显示列表 |
| `eui` | `@kurot/ui` | `Button`、`Panel`、`Skin`、布局和主题 |
| `tween` | `@kurot/game` | `Tween`、`Ease` 等游戏扩展 |

```ts
// Egret
class Main extends egret.Sprite {}

// Kurot
import { Sprite } from '@kurot/core';

class Main extends Sprite {}
```

Kurot 使用标准 ESM，不依赖 Egret 的全局命名空间和自定义模块加载器。入口代码需自行调用
`createPlayer()` 启动逻辑；CLI 生成的 HTML 不读取 `data-entry-class` 来实例化入口类。

### 5.4 输出差异

Development 默认输出到 `bin-debug/`，源码按目录生成 ESM 文件；引擎、主题和 namespace
位于 `js/`。Release 输出到 `bin-release/web/<timestamp>/`，文件压缩并带 content hash。

Release 仍会生成 `manifest.json`：

- `initial`：引擎与自定义 namespace chunk；
- `game`：主题脚本（如果存在）与应用入口。

资源 JSON 保持固定文件名，主题 JS 和代码 chunk 可以带 hash。

### 5.5 不支持或需要替换的 Egret 能力

| Egret 能力 | 迁移方式或限制 |
| --- | --- |
| Native / WXGame 等 target | 当前仅支持 HTML5 |
| `egret publish` | 使用 `kurot build --release` |
| Egret 全局命名空间 | 改为 `@kurot/*` ESM imports |
| `data-entry-class` 自举 | 在应用入口中调用 `createPlayer()` |
| typescript-plus 特性 | 改写为标准 TypeScript/esbuild 可处理的代码 |
| 浏览器自动刷新 | 当前 `kurot dev` 需要手动刷新 |
| 未注册 EXML 组件 | 加入 `exml.namespaces` barrel 或改用已支持组件 |

---

## 六、资源与主题迁移

建议保持以下结构：

```text
resource/
├── default.res.json
├── default.thm.json
└── skins/
    ├── ButtonSkin.exml
    └── ...
```

主题支持两种常见写法：

```jsonc
// Egret 路径形式
{
	"skins": {
		"eui.Button": "resource/skins/ButtonSkin.exml"
	},
	"autoGenerateExmlsList": false,
	"exmls": ["resource/skins/ButtonSkin.exml"]
}
```

```jsonc
// Kurot 类名形式
{
	"skins": {
		"eui.Button": "skins.ButtonSkin"
	}
}
```

当 `autoGenerateExmlsList` 为 `false` 且 `exmls` 非空时，CLI 按列表编译；其他情况下递归
扫描 `resource/`。构建后的主题会把可识别的路径值转换为皮肤类名，删除编译期列表字段，
并写入 `skinsJs`。启用 EXML 后，产物不会包含原始 `.exml` 文件。

`default.res.json` 可沿用 Egret 常见的 `groups` 和 `resources` 结构，但最终兼容程度由
当前 Kurot 资源运行时支持的资源类型决定，应在实际项目中逐项验证。

---

## 七、EXML 迁移

### 7.1 内置 namespace

```xml
<eui:Skin
	xmlns:eui="http://ns.egret.com/eui"
	xmlns:egret="http://ns.egret.com/egret">
</eui:Skin>
```

这些 URL 是 XML namespace 标识符。CLI 根据 `eui`、`egret`、`w` 和 `core` 前缀在内部解析，
不会访问 URL，因此无需自行搭建 `ns.egret.com`。

### 7.2 自定义 namespace

Egret 项目常见写法：

```xml
<eui:Skin xmlns:eui="http://ns.egret.com/eui" xmlns:game="game.*">
	<game:HealthBar />
</eui:Skin>
```

创建一个导出该 namespace 所有类的 barrel file：

```ts
// src/ui/index.ts
export { HealthBar } from './HealthBar.js';
```

然后配置 prefix：

```ts
export default {
	// ...
	exml: {
		themeFile: 'resource/default.thm.json',
		namespaces: {
			game: 'src/ui/index.ts',
		},
	},
};
```

CLI 会生成 `#ns/game` import-map 项和 `js/ns.game.js` chunk。EXML 标签名必须与 barrel
file 的导出名一致。

### 7.3 当前支持范围

支持常见组件与以下 EXML 写法：

- 普通属性和属性节点；
- `width="100%"` / `height="100%"`；
- `{expression}` 数据绑定；
- 根 Skin 的 `minWidth`、`minHeight` 等属性；
- `<eui:states>` 和 `states="up,down"` 简写；
- `property.state="value"` 状态属性；
- `includeIn` 和 `excludeFrom`。

EXML 并非保证与 Egret 全量语法完全兼容。当前 XML 解析器不支持 DTD、ENTITY 和 namespaced
attributes；组件必须存在于内置 registry 或已配置的自定义 namespace。未知标签会被警告并
从皮肤中丢弃，皮肤解析失败会生成空工厂但构建继续。因此迁移时必须阅读构建警告，不能只以
进程退出码判断成功。

---

## 八、推荐迁移流程

1. 使用 `npx @kurot/cli create new-project` 创建一个 `game` 模板项目。
2. 安装依赖并运行模板，先确认本机环境正常。
3. 分批迁移源码和资源，不要直接覆盖模板配置。
4. 将全局 `egret.*`、`eui.*` 和 Tween API 改为 Kurot package imports。
5. 迁移 `default.res.json`、主题文件和 EXML，处理构建警告。
6. 使用 `pnpm dev` 验证输入、触摸、状态、布局、滚动和资源加载。
7. 最后运行 `pnpm build -- --release` 验证 release 产物。

---

## 九、迁移检查清单

- [ ] `package.json` 已声明需要的 `@kurot/*` 运行时依赖。
- [ ] `kurot.config.ts` 的舞台、入口和主题路径正确。
- [ ] 源码已改用 ESM imports。
- [ ] 自定义 EXML prefix 已配置对应 barrel file。
- [ ] 构建日志没有未处理的 EXML warning。
- [ ] states、`includeIn`、`excludeFrom` 和数据绑定表现正确。
- [ ] TextInput、触摸、Scroller、弹出层等交互已在浏览器验证。
- [ ] development 与 release 模式均能启动并加载资源。
