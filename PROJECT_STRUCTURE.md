# Blakron 项目结构文档

> 更新日期：2026-07-01
> 本文档面向新加入的贡献者，介绍 Blakron 的整体设计目标、Monorepo 结构、各 package 职责边界，以及调试/性能分析手段。

---

## 1. 项目是什么

Blakron 是 **Egret 引擎的现代化重写**：

- 对外 **API 兼容 Egret**（`DisplayObject` / `Event` / `Graphics` / EUI 组件 / EXML 皮肤格式），老项目迁移成本低。
- 对内 **渲染架构参考 Pixi.js 8**：两阶段渲染（Build 指令集 → Execute 执行），多纹理批处理，RenderGroup 分层，取代 Egret 原有的 RenderNode 树遍历模型。
- 技术栈现代化：TypeScript `strict: true`、ESM、ES2022、`pnpm` workspace，不做旧浏览器/旧 API 兼容（详见 `docs/code-rules.md`）。
- 体量对比：Egret 核心 42,340 行 → Blakron `@blakron/core` 约 13,000 行。

一句话定位：**old Egret 的骨架（API、EXML、EUI）+ Pixi.js 的现代渲染内核 + 严格 TypeScript 工程化**。

---

## 2. Monorepo 总体结构

```
Blakron/
├── packages/            ← 所有引擎库（pnpm workspace 的实际内容）
│   ├── core/             @blakron/core   — 渲染引擎核心（最底层）
│   ├── cli/              @blakron/cli    — 构建工具 / EXML 编译器
│   ├── ui/                @blakron/ui     — EUI 兼容的 UI 组件框架
│   ├── game/             @blakron/game   — Tween / MovieClip / ScrollView 等游戏扩展
│   └── spine/             @blakron/spine  — Spine 4.2 骨骼动画运行时（版本兼容适配层）
├── examples/             示例项目（demo 用 Vite 手写 EXML 编译流程；my-game 是 CLI 生成的标准脚手架）
├── reference/            只读参考源码：egret-core / egret-cli / egret-game-library / egret-spine / pixijs
├── docs/                 架构决策文档（迁移状态、EXML 集成、WebGPU 迁移草案、Three.js 集成调研等）
└── tmp/                  临时文件
```

**依赖关系（单向，无循环依赖）：**

```
@blakron/core   ← 无内部依赖（引擎地基：渲染 / 事件 / 几何 / 资源 / 网络）
    ↑
@blakron/ui     ← 依赖 core（EUI 组件框架）
@blakron/game   ← 依赖 core（Tween / MovieClip / ScrollView / URLLoader）
@blakron/spine  ← 依赖 core（Spine 运行时适配层）
@blakron/cli    ← 无内部依赖（纯构建期工具，内置 EXML 编译器，不在浏览器运行时引入）
```

`ui`、`game`、`spine` 三者互不依赖，都只依赖 `core`，可以按需单独引入。`cli` 是纯 Node 端工具，不会打进产物里。

每个包都是独立的 npm 包（`@blakron/*`），有自己的 `package.json` / `tsconfig.json` / `vitest` 测试 / `docs/`，用 `pnpm` 管理，版本号目前各自独立演进（core 0.6.0 / cli 0.6.0 / ui 0.4.5 / game 0.3.0 / spine 0.2.0）。

历史上还有 `exml-parser`、`res`、`runtime` 几个包/占位目录，已按 `docs/merge-guide.md` 的方案分别合并进 `cli`（EXML 编译器）和 `core`（`resource/` 模块），减少跨包版本协调成本。

---

## 3. `@blakron/core` — 渲染引擎核心

路径：`packages/core/src/blakron/`

这是整个项目的地基，唯一没有内部依赖的包，负责场景图、渲染管线、事件、几何、资源加载等所有引擎基础能力。

```
blakron/
├── display/         场景图与显示对象
│   ├── DisplayObject.ts / DisplayObjectContainer.ts / Sprite.ts / Stage.ts
│   ├── Shape.ts / Graphics.ts / GraphicsPath.ts   （矢量绘图）
│   ├── Bitmap.ts / Mesh.ts                        （位图 / 网格变形）
│   ├── texture/  Texture.ts / BitmapData.ts / SpriteSheet.ts / RenderTexture.ts
│   └── enums/    （BlendMode、ScaleMode 等枚举）
│
├── player/          渲染管线与应用生命周期（引擎最核心的部分）
│   ├── Player.ts / createPlayer.ts / BlakronOptions.ts   应用入口，管理渲染循环
│   ├── SystemTicker.ts / TouchHandler.ts / ScreenAdapter.ts
│   ├── RenderPipe.ts / InstructionSet.ts   两阶段渲染的核心抽象（Build → Execute）
│   ├── webgl/       WebGL 渲染后端（主路径）
│   │   ├── WebGLRenderContext.ts / WebGLRenderer.ts / WebGLRenderBuffer.ts
│   │   ├── MultiTextureBatcher.ts   （多纹理批处理，单批最多 8 张纹理）
│   │   ├── WebGLVertexArrayObject.ts / WebGLDrawCmdManager.ts / WebGLProgram.ts
│   │   ├── pipes/   按渲染对象类型拆分的 RenderPipe 实现
│   │   │   BitmapPipe / GraphicsPipe / MeshPipe / TextPipe / FilterPipe / MaskPipe / ParticlePipe
│   │   └── shaders/  ShaderLib.ts（GLSL 着色器源码，含动态生成的模糊 tier）
│   └── canvas/      Canvas 2D 降级渲染后端（WebGL 不可用时兜底）
│       CanvasRenderer.ts / DisplayList.ts / RenderBuffer.ts
│
├── events/          Egret 兼容事件系统
│   Event / EventDispatcher / TouchEvent / TimerEvent / ProgressEvent / IOErrorEvent / FocusEvent ...
│
├── geom/            数学库：Point / Rectangle / Matrix
│
├── filters/          滤镜：BlurFilter（ping-pong 双 pass）/ ColorMatrixFilter / GlowFilter / DropShadowFilter / CustomFilter
│
├── text/             文本：TextField / BitmapText / BitmapFont / WordWrap / TextMeasurer / HtmlTextParser / StageText
│
├── resource/         资源管理器（原 Egret RES 模块的现代化重写，async/await API）
│   Resource.ts / ResourceLoader.ts（并发控制 + 失败重试）/ ResourceConfig.ts
│   analyzers/  Image / Json / Text / Sound / Sheet 五种内置解析器
│
├── net/              HttpRequest / ImageLoader
├── media/            Sound / SoundChannel / Video
├── system/           Capabilities（运行环境检测）
├── localStorage/     LocalStorage 封装
├── external/         ExternalInterface
├── utils/            ByteArray / Timer / Logger / FontManager / DebugLog / Base64Util ...
└── benchmark/         性能基准测试面板：BenchmarkRunner / MetricsCollector / PerfPanel / ReportExporter
```

**渲染管线设计（借鉴 Pixi.js 8，是本项目相对 Egret 最大的架构升级）：**

- **Build 阶段**：遍历场景图，生成扁平化的 `InstructionSet`（指令数组），而不是 Egret 原来的 RenderNode 树递归遍历。
- **Execute 阶段**：按 `renderPipeId` 分发指令给对应的 `RenderPipe` 实现（`pipes/` 目录），执行实际绘制。
- **脏标记分离**：`structureDirty`（需要重建指令集）与 `renderDirty`（只需局部更新数据）分离，避免每帧全量重建。
- **RenderGroup 分层**：静态子树可标记为独立渲染组，遍历成本为零。
- **多纹理批处理**：一个 draw call 最多合并 8 张纹理（WebGL1 用 if/else 链模拟数组索引，是未来 WebGPU 迁移时的重点优化对象）。

三级渲染兜底策略（当前已实现 WebGL + Canvas2D 两级，WebGPU 见第 6 节）：

```
WebGL（主路径，multi-texture batching）
  └─ 不支持时降级 → Canvas 2D（CanvasRenderer，功能对等但无批处理优化）
```

---

## 4. `@blakron/cli` — 构建工具 + EXML 编译器

路径：`packages/cli/src/`

替代旧 Egret CLI，基于 `esbuild`，内置一套完整的 EXML → ESM 编译流水线。

```
src/
├── index.ts / define.ts      CLI 入口 + defineConfig 辅助函数（供 blakron.config.ts 使用）
├── commands/                  四个子命令
│   build.ts   编译打包（开发态逐文件 / release 态压缩+内容哈希）
│   dev.ts     开发服务器（esbuild watch + SSE 热更新）
│   create.ts  项目脚手架（game / empty 模板）
│   clean.ts   清理构建产物
│
├── core/
│   ├── config.ts        blakron.config.ts 加载与校验（含 exml.namespaces 自定义命名空间配置）
│   ├── project.ts        项目结构探测；解析 exml.namespaces → customNamespaces（虚拟 specifier + 绝对路径）
│   ├── pipeline.ts       编译流水线编排（TS 编译 + EXML 编译 + 资源拷贝 + manifest 生成）
│   ├── dev-server.ts     开发服务器（HTTP 静态服务 + esbuild watch，无 HMR，浏览器需手动刷新）
│   ├── namespace-external-plugin.ts   esbuild 插件：把指向自定义命名空间入口的相对 import 改写为 external 虚拟 specifier
│   ├── template.ts       模板文件渲染
│   ├── errors.ts         自定义错误类（BuildError 等）
│   │
│   ├── exml/              EXML 编译器（原独立包 @blakron/exml-parser，已合并进来）
│   │   xml-parser.ts    轻量自实现 XML 解析器（支持命名空间 / CDATA / 注释）
│   │   ast.ts           EXML → SkinIR 的中间表示定义（含 unresolvedTags，记录被丢弹的未知标签）
│   │   exml-parser.ts   XML 树 → SkinIR
│   │   codegen.ts       SkinIR → ESM JS 代码生成（工厂函数）
│   │   registry.ts      eui:* / egret:* 命名空间到 @blakron/ui / @blakron/core 组件的映射表；
│   │                    自定义命名空间前缀（见下）在此优先匹配
│   │
│   └── plugins/          esbuild 插件化的构建步骤
│       compile-engine.ts / compile-custom-namespaces.ts / compile-source.ts / compile-exml.ts
│       copy-assets.ts / generate-html.ts / manifest.ts
│
├── templates/             `blakron create` 使用的项目模板
│   ├── game/    标准游戏模板（含 21 个默认 EXML 皮肤、resource/default.thm.json、Main.ts 生命周期）
│   └── empty/   最小化模板（纯 Canvas，无 UI/EXML 依赖）
│
└── utils/  fs.ts / logger.ts
```

**EXML 编译流水线：**

```
resource/skins/*.exml
    → parseXML()          原始 XML 解析
    → parseEXML()          转换为 SkinIR（属性绑定 {expr}、百分比尺寸、View States、skinParts）
    → generateCode()        生成 ESM 工厂函数
    → esbuild bundle        打包（release 模式下压缩+内容哈希）
    → js/default.thm[.min_<hash>].js   运行时 Theme 类动态 import 加载
```

发布策略支持 `path` / `content` / `gjs` / `json` 四种（`gjs` 为默认，生成独立 ESM 模块）。这是 Blakron 兼容老 Egret EUI 皮肤系统的关键：**EXML 文件本身不随产物发布，只在构建期编译为 JS**，运行时零解析开销。

**自定义 EXML 命名空间（迁移 Egret 自定义组件用）：**

老 Egret 项目常见 `xmlns:game="game.*"` 引用项目自定义组件（如 `<game:HeroNarrowIR/>`），运行时靠 `namespace` 声明 + `egret.getDefinitionByName()` 反射查找。Blakron 是编译期静态 `import`，没有全局命名空间树可反射，因此改用**构建配置替代运行时反射**：

```ts
// blakron.config.ts
exml: {
  themeFile: 'resource/default.thm.json',
  namespaces: {
    game: 'src/ui/index.ts',   // xmlns:game="game.*" → 这个 barrel 文件导出的所有类
  },
}
```

老代码里 `namespace game { export class HeroNarrowIR ... }` 迁移时去掉 `namespace` 包裹，改成模块级 `export class`，再在 `src/ui/index.ts` 里 `export { HeroNarrowIR } from './HeroNarrowIR.js'` 统一导出即可。

机制上复用了 `compile-engine.ts` 给 `@blakron/*` 引擎包打 chunk 的思路：`compile-custom-namespaces.ts` 把每个命名空间的 barrel 文件单独编译成一个 chunk（`js/ns.<prefix>.js`），通过虚拟 specifier（`#ns/<prefix>`）接入 HTML import map。EXML 里的 `<game:HeroNarrowIR/>` 编译期生成 `import { HeroNarrowIR } from "#ns/game"`；但游戏代码里如果写的是相对路径 `import { HeroNarrowIR } from './ui/index.js'`，esbuild 的 `external` 只按字面 import 字符串匹配，不会自动识别这是同一个模块——`namespace-external-plugin.ts` 就是为了解决这个问题：在 `onResolve` 阶段把解析后的绝对路径与配置的命名空间入口比对，命中则改写成虚拟 specifier 并标记 external。这样无论是 EXML 生成的代码还是手写的游戏代码引用该类，最终都指向浏览器里同一份模块实例，`instanceof` 判断不会因为被打包成两份而失效。

未在 `namespaces` 配置里注册、且不在内置组件表（`registry.ts`）中的标签会被静默丢弹并记录到 `SkinIR.unresolvedTags`，`compile-exml.ts` 据此打印 `logger.warn`，避免组件"消失"却毫无提示。

---

## 5. `@blakron/ui` — EUI 兼容的 UI 组件框架

路径：`packages/ui/src/blakron/`

从 Egret EUI 迁移而来，用标准 class 继承取代原来的 namespace + mixin + 原型注入模式。

```
blakron/
├── core/            UI 组件基础机制
│   UIComponent.ts / IUIComponent.ts   组件基类
│   UIState.ts        布局生命周期状态机（委托模式，不用 mixin）
│   Validator.ts       失效/验证调度器（invalidateProperties → validateProperties → ... → requestAnimationFrame）
│   Theme.ts / IThemeAdapter.ts / DefaultThemeAdapter.ts    皮肤主题系统，支持动态 import 加载 thm.js
│   IAssetAdapter.ts / DefaultAssetAdapter.ts / AssetAdapterRegistry.ts
│   IViewport.ts / IItemRenderer.ts / IDisplayText.ts / Direction.ts / ScrollPolicy.ts
│
├── components/       31 个 UI 组件（基础控件 / 容器 / 数据驱动 / 滚动条）
│   Button / CheckBox / RadioButton / ToggleButton / ToggleSwitch / ProgressBar
│   HSlider / VSlider / Range / SliderBase / ScrollBarBase / HScrollBar / VScrollBar
│   Rect / Image / Label / EditableText / TextInput
│   Group / Component / Skin / Panel / ViewStack / UILayer / Scroller / TouchScroll
│   DataGroup / List / ListBase / ItemRenderer / TabBar / ComboBox / Animation
│
├── layouts/          BasicLayout / VerticalLayout / HorizontalLayout / TileLayout / LinearLayoutBase
├── states/           State / AddItems / SetProperty / SetStateProperty / IOverride  （视图状态系统）
├── binding/          Binding.ts / Watcher.ts   （数据绑定，配合 EXML 的 {expr} 语法）
├── collections/      ArrayCollection.ts / ICollection.ts
└── events/           UIEvent / ItemTapEvent / CollectionEvent / PropertyEvent / ScrollerThrowEvent
```

**核心机制：** 每个组件持有一个 `UIState` 实例管理布局生命周期，`Group`/`Component` 把布局调用委托给它，不用原型混入。布局失效通过 `Validator` 批量调度到下一帧统一处理（`invalidateProperties/Size/DisplayList` → `requestAnimationFrame` → 分阶段 validate）。

---

## 6. `@blakron/game` — 游戏扩展库

路径：`packages/game/src/blakron/`

从 Egret 的 `extension/tween` + `extension/game` 合并迁移（两者原本平级、依赖层级相同，合并为一包降低维护成本）。

```
blakron/
├── tween/      Tween.ts / TweenGroup.ts / Ease.ts    补间动画引擎（对象池 + 链式 step 队列）
├── display/    MovieClip.ts / MovieClipData.ts / ScrollView.ts   序列帧动画 / 惯性滚动容器
└── net/        URLLoader.ts / URLRequest.ts / URLVariables.ts ...    高层资源加载封装
```

---

## 7. `@blakron/spine` — Spine 骨骼动画运行时

路径：`packages/spine/src/blakron/`

移植自 [egret-spine](https://github.com/tadazly/egret-spine)，把 Egret 的 `Mesh`/`Texture`/`RES` API 换成 Blakron 等价物；Spine 运行时本体来自官方 `@esotericsoftware/spine-core`（当前锁定 4.2，皮肤编辑器版本必须匹配）。

```
blakron/
├── SkeletonAnimation.ts     主显示对象，继承 Sprite，管理动画播放/track/事件
├── SkeletonRenderer.ts       骨骼 → 渲染指令
├── SlotRenderer.ts            单个 slot，继承 Mesh，走 Blakron 自己的 MeshPipe 批处理管线
├── Track.ts                    Promise 化的动画队列（waitPlayEnd / waitLoopStart 等）
├── BlakronAssetManager.ts    资源加载（基于 core 的 HttpRequest / ImageLoader）
├── BlakronTexture.ts           Texture 适配
└── EventEmitter.ts
```

这是四个主要包之外的第五个包，属于**版本兼容适配层**——只做 Egret 概念到 Blakron 概念的映射，不包含引擎核心逻辑。它的价值在于 Spine 动画能和 EUI 界面共享同一个 WebGL 渲染上下文与批处理管线（详见 `docs/threejs-integration.md` 中的分析），而不是被迫用 `spine-threejs` 之类的独立方案。

---

## 8. 编译期 vs 运行时边界

这是理解 Blakron 架构的关键一条线：

| 层                               | 何时运行                                      | 归属                                                                |
| -------------------------------- | --------------------------------------------- | ------------------------------------------------------------------- |
| EXML 解析、SkinIR 生成、代码生成 | **构建期**（`blakron build` / `blakron dev`） | `@blakron/cli`                                                      |
| 皮肤工厂函数执行、Theme 动态加载 | **运行时**                                    | `@blakron/ui`（`Theme.ts` 里 `import()` 加载 CLI 生成的 `.thm.js`） |
| 场景图、渲染、事件、资源加载     | **运行时**                                    | `@blakron/core`                                                     |

`.exml` 源文件永远不会被发布到产物里，运行时也没有 XML 解析开销——这是相对旧 Egret（运行时解析 EXML）的一个现代化改进点，同时保持了对老项目 `.exml` 皮肤文件格式的输入兼容。

---

## 9. Debug / 性能分析手段

现状（已实现，位于 `@blakron/core`）：

- **`utils/DebugLog.ts`**：一个极简的帧级调试开关，`enable()` 后接下来 N 帧（默认 3 帧）内 `DebugLog.active` 为 true，可在渲染管线关键路径打点观察前几帧行为，避免刷屏。已挂到 `globalThis` 方便在浏览器 DevTools 里手动 `DebugLog.enable()`。
- **`benchmark/` 模块**：`BenchmarkRunner`（预热/测量/暂停三阶段调度）+ `MetricsCollector`（FPS、渲染耗时、drawCalls、batch efficiency 统计，含 P95）+ `PerfPanel`（Canvas 绘制的实时 FPS 曲线，按颜色分段：≥55 绿色 / ≥30 黄色 / 其余红色）+ `SceneRegistry`（压力测试场景注册）+ `ReportExporter`。
- **`Player.perf`**：运行时暴露 `fps` / `drawCalls` 等指标，替代 Egret 原来的 `FPSDisplay` 组件（`docs/migration-status.md` 中确认不再单独实现该组件，直接用 `perf` 数据自行渲染 UI）。
- **WebGL Context Lost 恢复**：`WebGLRenderContext` 内置上下文丢失监听与资源重建，属于稳定性层面的“调试防线”。

规划中/建议方向（结合本项目现代化目标，供后续迭代参考）：

- **结构化 Logger 分级**（`utils/Logger.ts` 已存在）：按模块（render / resource / exml）区分 debug/info/warn，配合浏览器 DevTools 的 console filter 使用，取代零散 `console.log`（`docs/code-rules.md` 明确禁止裸 `console.log`）。
- **InstructionSet 可视化**：由于渲染管线已经是显式的扁平指令数组（而不是隐式的树遍历），非常适合做一个开发态的“指令集 Inspector”——每帧把 `InstructionSet` dump 成可读结构，比 Egret 时代去翻 RenderNode 树方便得多。这是这套新架构相比旧架构在可调试性上的天然优势，值得做成正式工具而不只是临时打点。
- **EXML 编译错误的开发态提示**：`docs/exml-integration-plan.md` 中已规划让编译错误不中断 dev server，只警告并保留上次输出；可以进一步在浏览器里叠一层 overlay 展示最近一次编译错误（类似 Vite 的错误浮层）。
- **WebGPU 迁移后的双后端对比模式**：`docs/webgpu-migration.md` 的里程碑 M5 里已经规划“WebGPU 帧率 ≥ WebGL 帧率”的基准对比，可以直接复用现有 `benchmark/` 模块做 A/B 切换验证，不需要新工具链。
- **headless GL 集成测试**：`docs/migration-status.md` 中列为待补充项，用于给 RenderPipe 各实现（BitmapPipe/GraphicsPipe/TextPipe/MeshPipe）做无浏览器环境的自动化视觉/指令断言。

---

## 10. 架构演进方向（已有草案文档）

`docs/` 目录下已有几份面向未来的设计文档，理解项目走向时建议一并阅读：

| 文档                             | 内容                                                                                                                                                                                                                                                  |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/webgpu-migration.md`       | WebGL → WebGPU 三级渲染策略草案。核心结论：`display/events/geom/filters/text/media/net/resource/utils` 等模块零改动，只需在 `player/` 下新增平行的 `webgpu/` 目录，`InstructionSet`/`RenderPipe` 的 Build 阶段可完全复用，只有 Execute 阶段需要重写。 |
| `docs/threejs-integration.md`    | 3D（Three.js）+ 2D（Blakron，含 Spine + EUI）混合渲染方案调研，推荐双 Canvas 叠加方案，Spine 保留在 Blakron 侧以共享渲染管线和触摸事件系统。                                                                                                          |
| `docs/merge-guide.md`            | 已完成的包合并记录：`exml-parser` → 合并进 `cli`；`res` → 规划并实现为 `core/resource/`。解释了当前只有 5 个包（而非更细粒度拆分）的历史原因。                                                                                                        |
| `docs/migration-status.md`       | 逐模块的 Egret → Blakron 迁移状态总表，包含“确认不做”清单（如设备传感器、i18n、反射 API、native 平台编译等）。                                                                                                                                        |
| `docs/exml-integration-plan.md`  | EXML 热更新 / Theme 动态加载的实施步骤。                                                                                                                                                                                                              |
| `docs/egret-dollar-set-audit.md` | Egret `$` 前缀内部属性的审计记录（迁移细节）。                                                                                                                                                                                                        |

---

## 11. 代码规范要点（详见 `docs/code-rules.md`）

写代码前建议先过一遍该文档，几个和架构强相关、容易踩坑的点：

- 应用层禁止 `null`，用 `undefined`；只有和 DOM/WebGL 交互的边界才允许 `null`。
- 禁止 `export default`，统一命名导出。
- 类成员必须按 `静态字段 → 实例字段 → 构造函数 → 访问器 → 公开方法 → 重写方法 → 私有方法` 顺序排列并用分组注释分隔。
- 单文件不超过 300 行，一个模块只做一件事（例如 `exml-compiler.ts` 只做编译编排，不掺拷贝/生成 manifest 的逻辑）。
- 不写兼容代码：不兼容旧 Egret API/配置格式，不兼容旧浏览器（目标 ES2022），不写 native 平台适配。

---

## 12. 快速定位指南

| 我想做的事                                      | 去哪个目录                                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 修一个渲染 bug（批处理/滤镜/遮罩）              | `packages/core/src/blakron/player/webgl/`                                                                     |
| 加一个新的 Egret 兼容 API（事件/几何/显示对象） | `packages/core/src/blakron/{events,geom,display}/`                                                            |
| 改 EXML 语法支持（新属性/新指令）               | `packages/cli/src/core/exml/`                                                                                 |
| 迁移老项目里 `xmlns:game="game.*"` 自定义组件   | `blakron.config.ts` 加 `exml.namespaces`；机制见 `packages/cli/src/core/plugins/compile-custom-namespaces.ts` |
| 加一个新的 UI 组件                              | `packages/ui/src/blakron/components/`                                                                         |
| 改 CLI 构建流程（build/dev 命令行为）           | `packages/cli/src/commands/` + `packages/cli/src/core/plugins/`                                               |
| 加 Tween/MovieClip 相关功能                     | `packages/game/src/blakron/`                                                                                  |
| Spine 动画相关                                  | `packages/spine/src/blakron/`                                                                                 |
| 查某模块的迁移进度/是否计划实现                 | `docs/migration-status.md`                                                                                    |
| 写一个新的性能测试场景                          | `packages/core/src/blakron/benchmark/`（`SceneRegistry` 注册）                                                |
