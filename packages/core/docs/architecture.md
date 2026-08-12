# @kurot/core 架构文档

> 当前版本：1.0.12。逐条变更记录见 [CHANGELOG.md](../CHANGELOG.md)。
> 面向 AI 智能体的速查文档见 [ai-context.md](./ai-context.md)（目录地图、反直觉行为清单、术语表、任务→文件速查表）。本文档面向人类读者，讲设计动机与内部机制，两份文档不重复内容，互相引用。

---

## 一、项目概述

`@kurot/core` 是 Kurot 引擎的核心运行时，提供显示对象、渲染、事件、几何、文本、资源、网络与媒体能力。对外 API 沿用 Egret 的 `DisplayObject`/事件模型，渲染内核则重写为 Pixi.js 8 风格的扁平 "InstructionSet + RenderPipe" 管线。

| 维度     | 说明                                            |
| -------- | ----------------------------------------------- |
| 模块系统 | ES Module（`@kurot/core` npm 包）              |
| 类型系统 | `strict: true`，全量类型安全，零 `any`         |
| 编译目标 | ES2022，仅支持现代浏览器                        |
| 渲染架构 | InstructionSet 指令驱动（借鉴 Pixi.js 8）       |
| 批处理   | 多纹理批处理（8 张/批）                         |
| 包管理   | `@kurot/core` workspace 包，pnpm               |
| 资源管理 | Resource 完整资源生命周期                       |
| WebGL    | WebGL 1 + WebGL 2 双后端，运行时自动选择        |

与 Egret 的差异、Breaking Changes 及迁移方式见根目录 [egret-migration.md](../../../docs/egret-migration.md)。

---

## 二、模块结构

```
packages/core/src/kurot/
├── display/          # 显示对象层（场景图）
│   ├── DisplayObject.ts              # 基类，含 renderDirty/cacheDirty/renderMode/RenderObjectType/bounds 缓存
│   ├── DisplayObjectContainer.ts     # 容器，含 isRenderGroup/sortableChildren/zIndex 排序
│   ├── Bitmap.ts                     # 位图显示（含 scale9Grid 九宫格）
│   ├── Sprite.ts                     # 精灵（容器 + Graphics）
│   ├── Shape.ts                      # 矢量图形
│   ├── Mesh.ts                       # 网格（vertices/indices/uvs）
│   ├── Stage.ts                      # 舞台根节点
│   ├── Graphics.ts                   # 矢量绘图命令
│   ├── GraphicsPath.ts               # 命令类型定义（PathCommandType, GraphicsCommand）
│   ├── enums/                        # BlendMode, BitmapFillMode, CapsStyle, GradientType, JointStyle, OrientationMode, StageScaleMode
│   └── texture/                      # BitmapData, Texture, SpriteSheet, RenderTexture
├── player/           # 渲染管线 + 游戏循环
│   ├── Player.ts                     # 播放器（Stage + Renderer 绑定，含 perf 性能指标）
│   ├── SystemTicker.ts               # 帧循环（RAF + ENTER_FRAME，含 callLater 延迟调用队列）
│   ├── RenderPipe.ts                 # RenderPipe 接口定义
│   ├── TouchHandler.ts               # 触摸/鼠标输入
│   ├── ScreenAdapter.ts              # 屏幕适配（7种缩放模式）
│   ├── createPlayer.ts               # 统一创建入口（含 Capabilities 初始化、RenderTexture 渲染器注入）
│   ├── KurotOptions.ts             # 配置接口
│   ├── canvas/                       # Canvas 2D 渲染后端（降级方案）
│   │   ├── CanvasRenderer.ts         # 直接遍历渲染器（支持全部 DisplayObject 类型 + 滤镜降级）
│   │   ├── DisplayList.ts            # cacheAsBitmap 离屏缓存
│   │   └── RenderBuffer.ts           # Canvas 2D 缓冲区（含 hitTestBuffer 像素级命中测试）
│   └── webgl/                        # WebGL 渲染后端（主渲染器）
│       ├── WebGLRenderer.ts          # 两阶段渲染器（build + execute，含 RenderGroup/DisplayListCache 支持）
│       ├── WebGLRenderContext.ts      # WebGL 状态管理 + draw 调度（WebGL1/2 自动选择，含 blurFboPool 对象池）
│       ├── WebGLRenderBuffer.ts      # WebGL 缓冲区（含对象池，支持 offscreen/stencil/scissor）
│       ├── WebGLRenderTarget.ts      # FBO 管理
│       ├── WebGLVertexArrayObject.ts  # VAO 顶点管理（单纹理 20B + 多纹理 24B 双布局）
│       ├── WebGLDrawCmdManager.ts    # 绘制命令队列（12 种命令类型，含 MULTI_TEXTURE）
│       ├── WebGLProgram.ts           # 着色器程序缓存
│       ├── WebGLUtils.ts             # WebGL 工具（compileShader, createProgram, premultiplyTint, deleteWebGLTexture）
│       ├── InstructionSet.ts         # 指令集（renderableIndex O(1) 查找，dirtyRenderables 增量更新）
│       ├── MultiTextureBatcher.ts    # 多纹理批处理（8张/批，slotMap 纹理槽位分配）
│       ├── pipes/                    # RenderPipe 实现
│       │   ├── BitmapPipe.ts         # 位图渲染指令
│       │   ├── GraphicsPipe.ts       # 矢量图形指令（Canvas光栅化 → 纹理上传）
│       │   ├── MeshPipe.ts           # 网格渲染指令
│       │   ├── FilterPipe.ts         # 滤镜 push/pop 指令（含对象池）
│       │   ├── MaskPipe.ts           # 遮罩 push/pop 指令（含对象池）
│       │   ├── TextPipe.ts           # 文本 WebGL 渲染（offscreen canvas → 纹理上传）
│       │   └── ParticlePipe.ts       # 粒子系统渲染
│       └── shaders/                  # GLSL 着色器
│           ├── ShaderLib.ts          # GLSL ES 1.00 着色器库（WebGL1）
│           └── ShaderLib2.ts         # GLSL ES 3.00 着色器库（WebGL2）
├── events/           # 事件系统（11 个事件类 + EventPhase + IEventDispatcher 接口）
├── geom/             # 几何工具（Matrix, Point, Rectangle）
├── filters/          # 滤镜（Blur, Glow, DropShadow, ColorMatrix, CustomFilter）
├── text/             # 文本渲染
│   ├── TextField.ts                  # 核心文本字段（含 textFlow 富文本、输入模式、密码模式）
│   ├── BitmapText.ts                 # 位图文本
│   ├── BitmapFont.ts                 # 位图字体
│   ├── StageText.ts                  # INPUT 模式 DOM 输入框
│   ├── HtmlTextParser.ts             # HTML 文本解析
│   ├── InputController.ts            # 输入控制器（选择、光标、键盘处理）
│   ├── TextMeasurer.ts               # 文本测量（measureText, getFontString）
│   ├── WordWrap.ts                   # 自动换行（tokenize, splitGraphemes）
│   ├── enums/                        # HorizontalAlign, VerticalAlign, TextFieldType, TextFieldInputType
│   └── types/                        # ITextElement, IWTextElement, ILineElement, IHitTextElement 等类型定义
├── resource/         # 资源管理
│   ├── Resource.ts                   # 资源核心（单例模式，async/await API，加载/缓存/生命周期）
│   ├── ResourceConfig.ts             # 资源配置
│   ├── ResourceEvent.ts              # 资源事件
│   ├── ResourceItem.ts               # 资源项
│   ├── ResourceLoader.ts             # 资源加载器
│   └── analyzers/                    # 资源分析器（AnalyzerBase, ImageAnalyzer, JsonAnalyzer, SheetAnalyzer, SoundAnalyzer, TextAnalyzer）
├── system/           # 系统能力
│   └── Capabilities.ts               # 运行时 WebGL 扩展/平台能力检测（UA + Client Hints）
├── net/              # 网络加载（HttpRequest, ImageLoader, HttpMethod, HttpResponseType）
├── media/            # 媒体（Sound, SoundChannel, Video）
├── benchmark/        # 性能基准（MetricsCollector, BenchmarkRunner, SceneRegistry, PerfPanel, ReportExporter, types）
├── utils/            # 工具类（ByteArray, Timer, Logger, FontManager, DebugLog, Base64Util, NumberUtils, toColorString）
│                     # 注：不提供 HashObject，对象身份比较用 === 或 WeakMap 键控查找
├── localStorage/     # 本地存储
└── external/         # 外部接口（ExternalInterface）
```

---

## 三、渲染管线架构

### 3.1 两阶段渲染（借鉴 Pixi.js 8）

```
Phase A — Build（仅 structureDirty 时）:
  遍历 DisplayObject 树 → 生成 Instruction（含 transform 快照）→ InstructionSet

Phase A' — Update（仅 renderDirty 时）:
  遍历 dirtyRenderables → 刷新 transform 快照（O(1) lookup via renderableIndex Map）

Phase B — Execute（每帧）:
  按指令顺序分发到 Pipe → 无场景图遍历
```

### 3.2 RenderPipe 体系

```
RenderPipe<T extends DisplayObject>
├── addToInstructionSet(renderable, set)  — 结构变化时调用
├── updateRenderable(renderable)          — 数据变化时调用
└── destroyRenderable(renderable)         — 对象销毁时调用（可选，见下方 GPU 纹理回收说明）

实现：
├── BitmapPipe    → BitmapInstruction    → drawImage()（含 scale9Grid 九宫格）
├── GraphicsPipe  → GraphicsInstruction  → Canvas光栅化 → 纹理上传 → drawTexture()
├── MeshPipe      → MeshInstruction      → drawMesh()
├── TextPipe      → TextInstruction      → offscreen canvas → 纹理上传 → drawImage()
├── ParticlePipe  → ParticleInstruction  → 粒子批处理渲染
├── FilterPipe    → FilterPush/Pop       → 离屏FBO → 着色器滤镜
└── MaskPipe      → MaskPush/Pop         → stencil/scissor/离屏合成
```

**GPU 纹理回收**：`destroyRenderable()` 目前不会被 `WebGLRenderer` 自动调用（`DisplayObject` 没有"永久销毁"信号——`$onRemoveFromStage` 会在临时移出舞台又重新加入时反复触发，接上调用链会让虚拟列表等场景反复重新栅格化/上传纹理）。因此 `GraphicsPipe`、`TextPipe` 各自缓存纹理的清理不依赖调用方显式调用，而是用 `FinalizationRegistry` 在对应的 `Graphics` / `TextField` 被 JS 引擎 GC 时自动 `gl.deleteTexture()`。`destroyRenderable()` 仍保留为可选的立即释放路径（调用时会 `unregister` 对应的 GC 回调，避免重复删除），供未来需要显式销毁时机的场景使用。`BitmapPipe` / `MeshPipe` 的 `destroyRenderable` 是 no-op，因为它们绘制用的纹理归属于 `BitmapData` 的生命周期，不由 Pipe 自身管理。

### 3.3 RenderGroup 分层

```typescript
backgroundLayer.isRenderGroup = true;
```

- 每个 RenderGroup 拥有独立的 InstructionSet
- 父 set 只包含一条 `renderGroup` 指令，指向子树 set
- 子树结构变化只触发自身 set 重建，不影响父 set
- 静态子树的 JS 遍历开销降为零
- 实现通过 `WeakMap<DisplayObjectContainer, InstructionSet>` 管理 group sets
- 使用 `WeakRef` 跟踪 group 生命周期，便于 GC

### 3.4 多纹理批处理

- `MultiTextureBatcher` 管理最多 8 个纹理槽位（WebGL1 最小保证纹理单元数）
- 顶点格式扩展：增加 `aTextureId` float 属性（stride 从 20B 增至 24B）
- Fragment shader 使用 if/else 链采样（WebGL1 兼容）
- mesh、filter、blend 变化自动 flush 回退到单纹理路径
- `WebGLVertexArrayObject` 维护双缓冲区（单纹理 + 多纹理），按需切换 GPU buffer 大小

### 3.5 脏标记系统

```
DisplayObject 脏标记：
├── cacheDirty    — cacheAsBitmap 缓存失效，向上传播
├── renderDirty   — 视觉数据变化（位置/纹理/alpha/tint），向上传播
└── renderMode    — 渲染模式（NONE/FILTER/CLIP/SCROLLRECT）

通知机制（单 Player 静态钩子，由 Player 构造函数赋值）：
├── $onStructureChange?: () => void                          — 结构变化回调
├── $onRenderableDirty?: (obj: DisplayObject) => void         — 渲染脏回调
├── DisplayObjectContainer.$onContainerStructureChange?: (owner) => void — 容器结构变化回调
├── $markDirty()
│   ├── 更新 worldAlpha / worldTint 缓存（O(1) 读取）
│   ├── 调用 $onRenderableDirty?.(this) → WebGLRenderer.markRenderableDirty()
│   └── 向上传播 cacheDirty + renderDirty
├── $updateRenderMode()
│   └── 调用 $onStructureChange?.() → WebGLRenderer.markStructureDirty()
└── DisplayObjectContainer.markDirtyInternal()
    └── 调用 $onContainerStructureChange?.(this) → markStructureDirty(owner)
```

引擎设计上始终是单 Player：`Player` 的构造函数直接把上述三个静态字段赋值
为具体的闭包函数（见 `player/Player.ts`），并在 `destroy()` 里清空它们。

### 3.6 RenderObjectType 快速路由

为避免热路径中的 `instanceof` 检查，DisplayObject 使用 `renderObjectType` 枚举：

| 枚举值     | 值  | 对应类型  | 路由 Pipe    |
| ---------- | --- | --------- | ------------ |
| `NONE`     | 0   | 无渲染    | —            |
| `BITMAP`   | 1   | Bitmap    | BitmapPipe   |
| `MESH`     | 2   | Mesh      | MeshPipe     |
| `SHAPE`    | 3   | Shape     | GraphicsPipe |
| `SPRITE`   | 4   | Sprite    | GraphicsPipe |
| `TEXT`     | 5   | TextField | TextPipe     |
| `PARTICLE` | 6   | Particle  | ParticlePipe |

---

## 四、WebGL 渲染后端

### 4.1 WebGL 版本选择

`WebGLRenderContext` 在初始化时自动检测并选择最佳后端：

- **WebGL 2 优先**：使用 `canvas.getContext('webgl2')`，加载 `ShaderLib2`（GLSL ES 3.00）
- **WebGL 1 降级**：回退到 `canvas.getContext('webgl')`，加载 `ShaderLib`（GLSL ES 1.00）。
  不使用 `experimental-webgl` 前缀——该别名只有 IE11/早期 Safari/旧版
  Android Chrome 才需要，现代浏览器的标准 `'webgl'` 已经足够。
- **无独立探测 canvas**：`Player` 直接在应用方传入的 canvas 上依次尝试
  `webgl2` → `webgl`，两者都失败才降级到 Canvas 2D，不额外创建临时 canvas
  探测能力。`checkWebGLSupport()` 函数仍导出，供需要独立探测的调用方使用，
  但 `Player` 自身不调用它。
- 着色器库通过实例属性动态绑定：`ctx.shaders`、`ctx.blurTierFn`、`ctx.makeBlurH`、`ctx.makeBlurV`

### 4.2 渲染流程

```
Player.render()
  → WebGLRenderer.render(stage, buffer, matrix)
    → Phase A: _buildInstructions() / _updateDirtyRenderables()
    → Phase B: _executeInstructions()
      → Pipe.execute() → WebGLRenderContext.drawImage/drawMesh/drawTexture()
    → WebGLRenderContext.flush() → _flush()
      → 上传顶点（bufferSubData）→ 遍历 DrawCmdManager → 分发 draw batch
```

### 4.3 着色器体系

| 着色器                                   | 用途                               | 来源      |
| ---------------------------------------- | ---------------------------------- | --------- |
| default_vert + texture_frag              | 标准纹理绘制                       | ShaderLib |
| multi_vert + multi_frag                  | 多纹理批处理（8单元）              | ShaderLib |
| default_vert + colorTransform_frag       | ColorMatrixFilter                  | ShaderLib |
| default_vert + glow_frag                 | Glow/DropShadow                    | ShaderLib |
| default_vert + blur_h_frag / blur_v_frag | 水平/垂直模糊（ping-pong 双 pass） | ShaderLib |
| default_vert + primitive_frag            | 纯色矩形（stencil mask）           | ShaderLib |
| fullscreen_vert                          | 全屏 quad blit（滤镜 pass）        | ShaderLib |

WebGL2（ShaderLib2）提供等价的 GLSL ES 3.00 版本着色器，使用 `in`/`out` 语法替代 `attribute`/`varying`，
`texture()` 替代 `texture2D()`，blur 着色器使用运行时生成的权重数组。

### 4.4 滤镜渲染

滤镜通过 FilterPipe 的 push/pop 指令对实现：

- **push 阶段**：分配离屏 FBO（含 filter padding 扩展），将后续 draw 重定向到离屏 buffer
- **pop 阶段**：调用 `compositeFilterResult()` 将离屏结果合成回父 buffer

合成流程（`compositeFilterResult`）：

1. `flush()` — 执行所有待处理的批处理命令，确保离屏 FBO 内容完整
2. BlurFilter ping-pong — 直接 GL 调用，不经过批处理队列
3. 显式激活父 buffer FBO — 防止批处理系统的 FBO 状态与实际 GL 状态不一致
4. `drawTexture()` — 通过批处理路径绘制，利用父 buffer 的 `globalMatrix` 正确定位
5. 立即 `flush()` — 在 FBO 状态已知正确时执行绘制，防止 feedback loop

各滤镜实现：

- **ColorMatrixFilter**：inline 优化路径，无离屏 FBO，直接设置 `activeFilter` 让叶子指令带滤镜绘制
- **BlurFilter**：ping-pong 双 pass 分离模糊（水平 → 临时 FBO → 垂直 → 离屏 FBO）。blurFboPool 缓存复用 FBO 对
- **GlowFilter / DropShadowFilter**：单 pass `glow_frag` 着色器，共用同一 shader 程序
- **CustomFilter**：用户自定义顶点/片段着色器，通过 `shaderKey` 自动缓存编译

Filter padding：离屏 buffer 按 `Filter.getPadding()` 扩展尺寸，`_setOffscreenOrigin` 计算世界坐标偏移，使内容的 bounds 原点落在 buffer 的 `(padX, padY)` 位置。

**纹理坐标 Y 轴注意事项**：顶点着色器通过 `projectionY = -h/2` 翻转 Y 轴使屏幕坐标系 Y 向下，但纹理坐标未翻转（WebGL 默认 Y=0 在底部）。普通渲染不受影响（UV 在 `cacheArrays` 中已正确映射），但 shader 内部做纹理坐标偏移时需注意方向。DropShadowFilter 的 angle uniform 传入时取反（`-angle`）以补偿 `sin` 分量的 Y 方向差异。

### 4.5 遮罩渲染

- scrollRect/maskRect 无旋转：scissor 裁剪（GPU 硬件加速）
- scrollRect/maskRect 有旋转：stencil 裁剪
- DisplayObject mask：离屏 buffer + destination-in 合成

---

## 五、Canvas 2D 渲染后端

Canvas 2D 渲染器保持直接遍历模式，作为 WebGL 不可用时的降级方案。

- Graphics 离屏 Canvas 缓存（`canvasCacheDirty` 脏标记）
- CSS filter 快速路径（Blur → `blur()`，DropShadow → `drop-shadow()`）
- ColorMatrixFilter CPU 像素操作降级
- cacheAsBitmap 支持（通过 DisplayList）
- 像素级命中测试（3x3 离屏 buffer，hitTestBuffer 函数）
- 支持所有 DisplayObject 类型：Bitmap, Shape, Sprite, Mesh, TextField（含样式、对齐、自动换行）
- TextField 渲染：测量 → 分行 → Canvas 2D fillText/strokeText 绘制

---

## 六、快速启动 API

### `createPlayer(options)`

```typescript
import { createPlayer, Event } from '@kurot/core';

const app = createPlayer({
	canvas: document.getElementById('game-canvas') as HTMLCanvasElement,
	frameRate: 60,
	scaleMode: 'showAll',
	contentWidth: 640,
	contentHeight: 1136,
});

app.start(root);
```

`createPlayer` 自动完成：

1. 调用 `Capabilities._init()` 检测运行环境（OS、isMobile、language）
2. 首次调用时注入 `RenderTexture.renderer`（Canvas 2D 离屏渲染器）
3. 创建 Stage、Player（WebGL 优先，Canvas 2D 降级）、TouchHandler、ScreenAdapter
4. 调用 `setupLifecycle(stage)` 绑定 ENTER_FRAME / RENDER 广播

### KurotOptions

| 属性            | 类型                | 默认值          | 说明         |
| --------------- | ------------------- | --------------- | ------------ |
| `canvas`        | `HTMLCanvasElement` | （必填）        | 渲染画布     |
| `frameRate`     | `number`            | `60`            | 目标帧率     |
| `scaleMode`     | `StageScaleMode`    | `'showAll'`     | 屏幕适配模式 |
| `contentWidth`  | `number`            | `canvas.width`  | 逻辑内容宽度 |
| `contentHeight` | `number`            | `canvas.height` | 逻辑内容高度 |
| `orientation`   | `OrientationMode`   | `'auto'`        | 屏幕方向     |
| `maxTouches`    | `number`            | `99`            | 最大触点数   |
| `background`    | `string`            | —               | CSS 背景色   |

### KurotApp 返回值

| 属性            | 类型            | 说明          |
| --------------- | --------------- | ------------- |
| `player`        | `Player`        | 渲染播放器    |
| `stage`         | `Stage`         | 舞台根节点    |
| `touchHandler`  | `TouchHandler`  | 触摸/鼠标处理 |
| `screenAdapter` | `ScreenAdapter` | 屏幕适配器    |
| `start(root?)`  | `() => void`    | 启动游戏循环  |
| `stop()`        | `() => void`    | 停止游戏循环  |

---

## 七、测试覆盖

`test/` 下按模块组织测试文件，运行 `pnpm --dir packages/core test` 查看当前
文件数与用例数。

| 模块       | 主要覆盖内容                                                                                                                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| events/    | Event, EventDispatcher, EventPropagation, EventMap, TouchEvent, HTTPStatusEvent, ProgressEvent                                                                                                           |
| geom/      | Matrix, Point, Rectangle                                                                                                                                                                                 |
| utils/     | ByteArray, Base64Util, Logger, DebugLog, NumberUtils, toColorString                                                                                                                                      |
| display/   | DisplayObject, DisplayObjectContainer, DisplayObjectIntegration, Bitmap, BitmapData, Sprite, Shape, Mesh, Stage, StageText, Graphics, Texture, SpriteSheet, BlendMode, DisplayList                       |
| filters/   | Filter (全部滤镜), CustomFilter, filters（滤镜集成）, EffectTransform（离屏效果变换正确性）                                                                                                              |
| media/     | Sound, SoundChannel, Video                                                                                                                                                                               |
| player/    | InstructionSet, InstructionPool, RenderGroup, TextPipe, MaskPipe, WebGLRendererDirty, WebGLRendererLeaf, WebGLVertexArrayObject, WebGLRenderBuffer, WebGLBlurFramebufferPool, CreatePlayer, TouchHandler |
| net/       | HttpRequest, ImageLoader                                                                                                                                                                                 |
| resource/  | Resource（并发 loadGroup 队列化）, ResourceLoader（并发/重试/无 analyzer 场景）                                                                                                                          |
| benchmark/ | 性能基准测试                                                                                                                                                                                             |
| text/      | 通过 display 集成测试覆盖                                                                                                                                                                                |


