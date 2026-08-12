# Kurot Core 架构文档

> 版本：0.6.2 | 更新日期：2026-07-24

---

## 一、项目概述

Kurot 是对 Egret 游戏引擎的现代化翻新。在保持与 Egret 对外 API 一致性的前提下，
完成了模块系统现代化、类型安全升级、渲染架构重构三大目标。

| 指标     | 旧 Egret                    | Kurot                                   |
| -------- | --------------------------- | ----------------------------------------- |
| 源文件数 | 166                         | ~142（含 index.ts）                       |
| 代码行数 | 42,340                      | ~18,450                                   |
| 模块系统 | `namespace egret`           | ES Module                                 |
| 类型系统 | `strict` 未开启，大量 `any` | `strict: true`，全量类型安全，零 `any`    |
| 编译目标 | ES5/ES3                     | ES2022                                    |
| 渲染架构 | RenderNode 三阶段           | InstructionSet 指令驱动（借鉴 Pixi.js 8） |
| 批处理   | 同纹理合并                  | 多纹理批处理（8张/批）                    |
| 包管理   | 无 package.json（monolith） | `@kurot/core` workspace 包              |
| 资源管理 | 无独立模块                  | Resource 完整资源生命周期                 |
| WebGL    | 仅 WebGL 1                  | WebGL 1 + WebGL 2 双后端，自动选择        |

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
│       │   └── ParticlePipe.ts       # 粒子系统渲染（🆕 v0.5.x）
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
├── resource/         # 资源管理（🆕 v0.3.2）
│   ├── Resource.ts                   # 资源核心（单例模式，async/await API，加载/缓存/生命周期）
│   ├── ResourceConfig.ts             # 资源配置
│   ├── ResourceEvent.ts              # 资源事件
│   ├── ResourceItem.ts               # 资源项
│   ├── ResourceLoader.ts             # 资源加载器
│   └── analyzers/                    # 资源分析器（AnalyzerBase, ImageAnalyzer, JsonAnalyzer, SheetAnalyzer, SoundAnalyzer, TextAnalyzer）
├── system/           # 系统能力（🆕 v0.3.2）
│   └── Capabilities.ts               # 运行时 WebGL 扩展/平台能力检测（UA + Client Hints）
├── net/              # 网络加载（HttpRequest, ImageLoader, HttpMethod, HttpResponseType）
├── media/            # 媒体（Sound, SoundChannel, Video）
├── benchmark/        # 性能基准（MetricsCollector, BenchmarkRunner, SceneRegistry, PerfPanel, ReportExporter, types）
├── utils/            # 工具类（HashObject, ByteArray, Timer, Logger, FontManager, DebugLog, Base64Util, NumberUtils, toColorString）
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

| 设计点   | Egret RenderNode             | Kurot InstructionSet                         | Pixi.js 8                                        |
| -------- | ---------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| 中间表示 | RenderNode 树                | 扁平 Instruction 数组                          | 扁平 Instruction 数组                            |
| 缓存粒度 | 每个 DisplayObject 一个 Node | 整棵树/RenderGroup 一个 Set                    | 每个 RenderGroup 一个                            |
| 脏检查   | $renderDirty 跳过子树重建    | structureDirty 全量重建 / renderDirty 局部更新 | structureDidChange + childrenRenderablesToUpdate |
| 分发方式 | node.type switch             | renderPipeId 字符串分发                        | renderPipeId 字符串分发                          |
| 批处理   | 同纹理合并                   | 多纹理批处理（8张/批）                         | Batcher 多纹理                                   |

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

通知机制（支持多 Player 实例）：
├── addStructureChangeListener(fn)  — 注册结构变化回调
├── addRenderableDirtyListener(fn)  — 注册渲染脏回调
├── addContainerStructureChangeListener(fn) — 注册容器结构变化回调
├── markDirty()
│   ├── 更新 worldAlpha / worldTint 缓存（O(1) 读取）
│   ├── 调用 _onRenderableDirty(this) → WebGLRenderer.markRenderableDirty()
│   └── 向上传播 cacheDirty + renderDirty
├── updateRenderMode()
│   └── 调用 _onStructureChange() → WebGLRenderer.markStructureDirty()
└── DisplayObjectContainer.markDirtyInternal()
    └── 调用 _onContainerStructureChange(this) → markStructureDirty(owner)
```

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

WebGLRenderContext 在初始化时自动检测并选择最佳后端：

- **WebGL 2 优先**：使用 `canvas.getContext('webgl2')`，加载 `ShaderLib2`（GLSL ES 3.00）
- **WebGL 1 降级**：回退到 `canvas.getContext('webgl')` 或 `experimental-webgl`，加载 `ShaderLib`（GLSL ES 1.00）
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

## 七、与 Egret 的 API 对比

### 7.1 显示对象 API

| Egret API                                                                | 状态                                        |
| ------------------------------------------------------------------------ | ------------------------------------------- |
| `x/y/scaleX/scaleY/rotation/alpha/visible/touchEnabled`                  | ✅ 完全一致                                 |
| `anchorOffsetX/Y`                                                        | ✅ 完全一致                                 |
| `width/height`                                                           | ⚠️ 行为变更：使用 explicitWidth/Height 模式 |
| `mask` (DisplayObject/Rectangle) / `scrollRect`                          | ✅ 完全一致                                 |
| `cacheAsBitmap` / `filters`                                              | ✅ 完全一致                                 |
| `getBounds()` / `globalToLocal()` / `localToGlobal()` / `hitTestPoint()` | ✅ 完全一致                                 |
| `addChild/removeChild/swapChildren/setChildIndex`                        | ✅ 完全一致                                 |
| `getChildAt`                                                             | ⚠️ 越界返回 `undefined`（Egret 可能抛异常） |
| `removeChildAt`                                                          | ⚠️ 越界返回 `undefined`（Egret 可能抛异常） |
| `removeChildren`                                                         | ⚠️ 返回 `void`（Egret 返回数组）            |
| `bitmap.texture/smoothing/fillMode/scale9Grid/pixelHitTest`              | ✅ 完全一致                                 |
| `bitmap.width/height`                                                    | ⚠️ 使用 explicitBitmapWidth/Height 模式     |
| `mesh.vertices/indices/uvs`                                              | ✅ 完全一致                                 |
| `graphics.beginFill/lineStyle/drawRect/drawCircle/...`                   | ✅ 完全一致                                 |
| `stage.stageWidth/stageHeight/frameRate/scaleMode/orientation`           | ✅ 完全一致                                 |
| `blendMode`                                                              | ⚠️ 值从 `"normal"` 改为 `"source-over"`     |
| `matrix` getter                                                          | ⚠️ 返回 clone（Egret 返回引用）             |

### 7.2 新增 API（Egret 无对应）

| 属性/方法                                    | 说明                            |
| -------------------------------------------- | ------------------------------- |
| `displayObject.tint`                         | 着色（0xRRGGBB）                |
| `displayObject.zIndex` / `sortableChildren`  | 排序                            |
| `displayObject.skewX/skewY`                  | 斜切变换                        |
| `displayObject.measuredWidth/measuredHeight` | 内容测量尺寸（只读）            |
| `container.isRenderGroup`                    | 独立渲染组标记                  |
| `graphics.drawArc()`                         | 原生弧线绘制                    |
| `graphics.lineStyle(..., lineDash?)`         | 虚线参数                        |
| `CustomFilter`                               | 自定义 WebGL 着色器滤镜         |
| `EventDispatcher.once()`                     | 一级公开方法                    |
| `Player.perf`                                | 性能指标（fps/drawCalls 等）    |
| `createPlayer(options)`                      | 统一创建入口                    |
| `RenderObjectType` enum                      | 快速类型路由（替代 instanceof） |
| `tokenize()` / `splitGraphemes()`            | 文本分词/字素分割               |
| `measureText()` / `getFontString()`          | 文本测量/字体字符串构建         |

### 7.3 事件系统

11 个事件类 + EventPhase 枚举 + IEventDispatcher 接口，导出名称与 Egret 一致。内部优化：存储改为 `Map`，对象池改为 `WeakMap`，移除 `thisObject` 参数。

事件类列表：Event, EventPhase, FocusEvent, HTTPStatusEvent, IOErrorEvent, ProgressEvent, StageOrientationEvent, TextEvent, TimerEvent, TouchEvent, IEventDispatcher

### 7.4 其他模块

| 模块                                       | 状态        | 差异说明                    |
| ------------------------------------------ | ----------- | --------------------------- |
| geom (Matrix/Point/Rectangle)              | ✅ API 兼容 | 对象池 `create()/release()` |
| filters (Blur/Glow/DropShadow/ColorMatrix) | ✅ API 兼容 |                             |
| filters (CustomFilter)                     | 🆕 全新     | 自定义 WebGL 着色器滤镜     |
| net (HttpRequest/ImageLoader)              | ✅ API 兼容 |                             |
| media (Sound/SoundChannel/Video)           | ✅ API 兼容 |                             |
| text (TextField/BitmapText/BitmapFont)     | ✅ API 兼容 |                             |
| text (HtmlTextParser/InputController)      | 🆕 全新     | HTML 解析 + 输入控制        |
| text (WordWrap/TextMeasurer)               | 🆕 全新     | 自动换行 + 文本测量         |
| localStorage                               | ✅ API 兼容 |                             |
| ExternalInterface                          | ✅ API 兼容 |                             |
| utils (ByteArray/Timer/HashObject)         | ✅ API 兼容 |                             |
| utils (Base64Util/NumberUtils/DebugLog)    | 🆕 全新     | 编码/数学/调试工具          |
| Resource                                   | 🆕 全新     | 完整资源生命周期管理        |
| Capabilities                               | 🆕 全新     | 运行时环境能力检测          |

---

## 八、Breaking Changes

| 变更                                     | 影响                          | 迁移方式                                         |
| ---------------------------------------- | ----------------------------- | ------------------------------------------------ |
| `thisObject` 参数移除                    | 所有事件监听代码              | 使用箭头函数                                     |
| `BlendMode` 值变化                       | `"normal"` → `"source-over"`  | 使用常量                                         |
| `width/height` 行为变更                  | Egret 通过 scaleX/scaleY 模拟 | 使用 explicitWidth/Height 或直接设 scaleX/scaleY |
| `matrix` getter 返回 clone               | 依赖引用修改 matrix 的代码    | 改用 `setMatrix()`                               |
| `removeChildren()` 返回值                | `DisplayObject[]` → `void`    | 不依赖返回值                                     |
| `getChildAt()` 越界                      | 抛异常 → 返回 `undefined`     | 检查返回值                                       |
| hitTest 返回值                           | `null` → `undefined`          | 检查 `=== null`                                  |
| 命名空间                                 | `egret.xxx` → ES Module       | 全量替换                                         |
| `Texture.getPixel32/getPixels/toDataURL` | 已废弃                        | 仅 `RenderTexture.getPixel32` 可用               |
| `Base64Util.encode` 签名                 | `string` → `ArrayBuffer`      | `encode(new TextEncoder().encode(str))`          |

---

## 九、架构级变更（相对 Egret）

- RenderNode 中间层 → InstructionSet 指令驱动，12 个 nodes/paths 文件移除
- Graphics 从 `sys.GraphicsNode` + `sys.Path2D` → `GraphicsCommand[]` 扁平命令数组
- "接口 + Web 实现 + Native 实现"三文件模式合并为单一实现，每模块减少 60-85% 代码
- Native 渲染路径（`egret.nativeRender`、`egret_native.*`）全部移除
- 全局变量（`global.egret`）→ ES Module 导入
- `$field` / `$method()` → `private _field` / `@internal`
- 移除遗留代码：bind polyfill、手写 UTF-8、IE 兼容、vendor 前缀、typescript-plus 等
- WebGL 2 支持：双着色器库（GLSL ES 1.00 + 3.00），运行时自动选择
- RenderObjectType 枚举替代 instanceof，热路径零开销类型路由
- 多 Player 实例支持：通过 listener 注册模式替代单一静态回调

---

## 十、测试覆盖

42 个测试文件，569 个测试用例，全部通过（`pnpm run test`）。

| 模块       | 测试文件数 | 主要覆盖内容                                                                                                                                               |
| ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| events/    | 6          | Event, EventDispatcher, EventPropagation, TouchEvent, HTTPStatusEvent, ProgressEvent                                                                       |
| geom/      | 3          | Matrix, Point, Rectangle                                                                                                                                   |
| utils/     | 7          | ByteArray, HashObject, Base64Util, Logger, DebugLog, NumberUtils, toColorString                                                                            |
| display/   | 13         | DisplayObject, DisplayObjectContainer, DisplayObjectIntegration, Bitmap, BitmapData, Sprite, Shape, Mesh, Stage, Graphics, Texture, SpriteSheet, BlendMode |
| filters/   | 3          | Filter (全部滤镜), CustomFilter, filters（滤镜集成）                                                                                                       |
| media/     | 3          | Sound, SoundChannel, Video                                                                                                                                 |
| player/    | 2          | InstructionSet, TextPipe（GPU 纹理回收 destroyRenderable/FinalizationRegistry 路径）                                                                       |
| net/       | 2          | HttpRequest, ImageLoader                                                                                                                                   |
| resource/  | 2          | Resource（并发 loadGroup 队列化）, ResourceLoader（并发/重试/无 analyzer 场景）                                                                            |
| benchmark/ | 1          | 性能基准测试                                                                                                                                               |
| text/      | —          | 通过 display 集成测试覆盖                                                                                                                                  |

---

## 十一、CLI 工具链

```
packages/cli/
├── src/
│   ├── index.ts              # 入口（commander.js）
│   ├── commands/             # build / create / clean
│   ├── core/                 # config / compiler / exml-compiler / template
│   └── utils/
└── templates/game/           # 项目模板
```

`kurot.config.ts` 替代旧的 `egretProperties.json` + `index.html data-*`：

```typescript
import { defineConfig } from '@kurot/cli';
export default defineConfig({
	target: 'html5',
	entry: 'src/Main.ts',
	stage: { width: 640, height: 1136, scaleMode: 'showAll', frameRate: 60 },
});
```

| 维度      | 旧 Egret                                  | Kurot                     |
| --------- | ----------------------------------------- | --------------------------- |
| CLI 框架  | 手写参数解析                              | commander.js                |
| TS 编译器 | typescript-plus（魔改 tsc）               | esbuild                     |
| 配置文件  | egretProperties.json + index.html data-\* | kurot.config.ts           |
| EXML 编译 | 内嵌在 tools/lib/eui/                     | 独立包 @kurot/exml-parser |
| 模块系统  | CommonJS                                  | ESM                         |

---

## 十二、变更日志

### 0.6.2（当前版本）

**GPU 资源泄漏修复**

- `TextPipe` 补上与 `GraphicsPipe` 一致的 `FinalizationRegistry` 纹理回收机制：`TextField` 被 GC 时自动 `gl.deleteTexture()`，此前该缓存没有任何释放路径，长时间运行的场景（频繁刷新文字内容）会持续泄漏显存
- `destroyRenderable()` 补充为立即释放路径（`unregister` 对应 GC token 后立即删纹理），避免手动调用和 GC 回调重复删除同一纹理

**运行时问题修复**（另见 CHANGELOG.md）

- `ResourceLoader` 的 `activeCount` 计数错误修复（重试路径重复递减、无 analyzer 分支永不递减，均可能导致 `start()` 挂起）
- `Resource.loadGroup()` 并发调用不再互相覆盖回调，改为通过持久化 Promise 链串行化
- `ByteArray` 的 `bytesAvailable`/`validate()` 读边界从物理 buffer 容量改为逻辑写入位置，避免读出未初始化内存
- `EventDispatcher.once()` 在跨 dispatcher 重入时可能多次触发的问题修复

**文档整理**

- 补充 JSDoc 覆盖 `WebGLRenderer` 的构建/执行管线关键方法
- 删除过时的迁移类文档（`$` 前缀迁移、命名审计、旧版迁移状态、开发计划快照），均已完成或被本文档取代

---

### 0.5.18

**测试覆盖大幅扩展**

- 测试文件从 18 个增至 37 个，测试用例从 310 个增至 532 个
- 新增测试模块：Bitmap, BitmapData, BlendMode, CustomFilter, DebugLog, DisplayObject, DisplayObjectContainer, DisplayObjectIntegration, EventPropagation, Graphics, HTTPStatusEvent, InstructionSet, Logger, Mesh, NumberUtils, Shape, Sprite, SpriteSheet, Stage, Texture, TouchEvent, toColorString
- 全部 532 个测试用例通过

**WebGL 2 支持**

- 新增 `ShaderLib2.ts`：GLSL ES 3.00 着色器库，使用 `in`/`out` 语法、`texture()` 函数、运行时 blur 权重数组
- `WebGLRenderContext` 初始化时自动检测 WebGL2 支持，优先使用 WebGL2 上下文
- 双着色器库通过实例属性动态绑定（`ctx.shaders`、`ctx.blurTierFn` 等）

**渲染管线增强**

- 新增 `ParticlePipe`：粒子系统 WebGL 渲染指令
- `RenderObjectType` 枚举新增 `PARTICLE = 6`
- `WebGLRenderer._buildLeaf` 支持 PARTICLE 类型路由
- `WebGLRenderer._executeInstructions` 支持 particle 指令执行

**显示系统增强**

- `DisplayObject` 新增 `addStructureChangeListener` / `addRenderableDirtyListener` 注册模式，支持多 Player 实例
- `DisplayObjectContainer` 新增 `addContainerStructureChangeListener` 注册模式
- `RenderObjectType` 和 `RenderMode` 作为公开枚举导出
- `Graphics` 导出 `setGraphicsHitTest` 函数
- `Bitmap` 导出 `setBitmapPixelHitTest` 函数
- `BitmapData` 导出 `CompressedTextureData` 类型

**文本模块增强**

- `TextMeasurer` 导出 `measureText` 和 `getFontString` 公共函数
- `WordWrap` 导出 `tokenize` 和 `splitGraphemes` 公共函数
- `TextField` 完善输入控制（`InputController`）、HTML 解析（`HtmlTextParser`）

**工具模块扩展**

- 新增 `Base64Util`：ArrayBuffer ↔ Base64 编解码
- 新增 `NumberUtils`：数值工具函数
- 新增 `toColorString`：颜色值转 CSS 字符串

**WebGL 渲染后端优化**

- `WebGLRenderContext` 新增 `blurFboPool`：BlurFilter FBO 对象池，按尺寸复用
- `WebGLRenderContext` 新增 `contextLost` / `contextRestored` 事件处理及回调注册
- `WebGLRenderBuffer` 对象池容量限制为 6 个
- `MultiTextureBatcher` 多纹理合批，单次 draw call 最多 8 个纹理槽位
- `WebGLVertexArrayObject` 维护单纹理（20B stride）和多纹理（24B stride）双缓冲区

**Canvas 2D 渲染后端增强**

- `CanvasRenderer` 支持全部 DisplayObject 类型渲染（含 TextField 完整样式）
- Filter 降级路径完善（CSS filter + CPU pixel 操作）

**代码质量**

- 全量替换显式 `undefined` 赋值为 optional property 语法
- `DisplayObjectContainer` 显式声明 `children` 字段，移除非空断言

---

### 0.5.2

**目录结构重组**

- `player/` 下新增 `canvas/` 和 `webgl/` 子目录，将两种渲染后端物理隔离
- `pipes/` 移入 `webgl/pipes/`，`InstructionSet`、`MultiTextureBatcher` 等移入 `webgl/`
- `shaders/` 独立为子目录，新增 `ShaderLib2.ts` 扩展着色器

**text 模块扩展**

- 新增 `HtmlTextParser.ts`：HTML 文本解析
- 新增 `InputController.ts`：输入控制器
- 新增 `TextMeasurer.ts`：文本测量
- 新增 `WordWrap.ts`：自动换行

---

### 0.3.3

**GL 状态管理修复**

- `FilterPipe` / `MaskPipe`：修正 GL 状态管理，防止滤镜和遮罩 pass 之间 blend state 泄漏

**代码风格**

- 全量替换显式 `undefined` 赋值为 optional property 语法
- `DisplayObjectContainer` 显式声明 `children` 字段，移除非空断言

---

### 0.3.2

**Resource 资源管理模块**

- 新增 `resource/` 模块：`Resource`、`ResourceConfig`、`ResourceEvent`、`ResourceItem`、`ResourceLoader`、`analyzers/`
- 支持完整的资源加载、缓存、生命周期管理

**Capabilities 系统能力检测**

- 新增 `system/Capabilities.ts`：运行时 WebGL 扩展和平台能力检测 API

**命名空间迁移**

- 内部命名空间从 `Heron` 全面迁移至 `Kurot`

**TextPipe 集成**

- TextPipe 正式集成到 player 渲染管线

---

### 0.2.4

**TextPipe 完成**

- 实现 TextField WebGL 渲染（offscreen canvas 光栅化 → WebGLTexture 上传）
- `WebGLRenderer` 注册 TextPipe，按 `renderObjectType` 路由
- text 模块结构完善（enums/types/StageText）
- InstructionSet 单元测试

---

### 0.2.3

- WebGL Context Lost 恢复完善
- FilterPipe / MaskPipe blend mode 状态恢复 + 指令对象池
- DisplayObject bounds 计算缓存
- Video 帧渲染修复
- Benchmark 模块（5 种压测场景）

---

### 0.2.1

- 初始架构文档版本
