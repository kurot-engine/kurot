# Kurot → PixiJS 8 对齐规划

> 本文档是路线图/提案，不描述当前已实现的行为。当前实现请看
> [architecture.md](./architecture.md)。下述各项截至 core 1.0.12 均尚未实现，
> 除非条目内注明"部分完成"。

---

## 当前定位

Kurot 的渲染管线（InstructionSet + RenderPipe + 多纹理合批）已经是 PixiJS 8 级别的设计，核心差距在**广度**而非**深度**。本文档规划如何逐步对齐 PixiJS 8 的渲染能力。

### 已对齐的能力

已实现，详见 [architecture.md](./architecture.md)：

- InstructionSet 扁平化指令集
- RenderPipe 分派体系
- 多纹理合批（MultiTextureBatcher）
- 脏标记系统（structureDirty / renderDirty）
- 指令/对象池复用
- FinalizationRegistry GPU 纹理自动回收
- GPU buffer 预分配 + bufferSubData
- Blur FBO 池复用
- RenderGroup 独立指令集
- WebGL 1 + 2 双后端自动选择
- ParticlePipe 粒子系统

---

## P1：高收益低改动

### 1. 动态纹理槽位

**现状**：`MultiTextureBatcher.MAX_TEXTURES` 硬编码为 8（`MultiTextureBatcher.ts`），注释写明"WebGL1 最小保证值"。`getOrAssignSlot()` 与 `isFull()` 都以这个常量为上限，因此实际合批槽位永远是 8。

关键事实：`WebGLRenderContext` 构造函数里**已经**查询了 `gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)`，但随即被 `Math.min(..., MultiTextureBatcher.MAX_TEXTURES)` 截到 8，存入 `_maxTextureUnits`；而该字段唯一用途是在 `drawTexture()` 里当 `> 1` 的布尔门，并不参与槽位上限决策。也就是说：GPU 真实能力已查出却没被用上——WebGL2 设备（规范保证 ≥16）被强制限制在 8，浪费了一半合批能力。

**PixiJS 做法**：`getMaxTexturesPerBatch()` 从 GPU 查询 `MAX_TEXTURE_IMAGE_UNITS`，动态决定批处理槽位数。

**方案**：GPU 查询已在 `WebGLRenderContext` 就位，无需重复。只需把"已查到却被截断"的值注入 `MultiTextureBatcher`，让槽位上限由它驱动：

```ts
// MultiTextureBatcher.ts
export class MultiTextureBatcher {
	// 移除硬编码
	// public static readonly MAX_TEXTURES = 8;

	private readonly _maxTextures: number;

	public constructor(maxTextures: number) {
		this._maxTextures = maxTextures;
		this.slots = new Array(maxTextures);
	}

	public get maxTextures(): number {
		return this._maxTextures;
	}
}
```

`WebGLRenderContext` 里把 `_maxTextureUnits` 的上限从 8 提到 16，再把该值注入 batcher：

```ts
// WebGLRenderContext.ts 构造函数
this._maxTextureUnits = Math.min(
	gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) as number,
	16, // 安全上限，避免 shader 过大
);
// 注意：_batcher 当前是字段初始化器（this._batcher = new MultiTextureBatcher()），
// 先于构造函数体执行，那时 gl 还不存在。必须把 batcher 的创建挪进构造函数体，
// 在 _maxTextureUnits 算出之后，再 new MultiTextureBatcher(this._maxTextureUnits)。
```

**联动**：

- `ShaderLib`/`ShaderLib2` 的 `multi_frag`（`ShaderLib.ts`、`ShaderLib2.ts`）的 `uniform sampler2D uSamplers[8]` 与 8 路 if/else 需参数化为 N。**注意 GLSL 约束**：GLSL ES 1.00 要求 sampler 数组下标必须是常量，因此动态生成的必须是常量下标的 if/else 链（不能直接 `uSamplers[id]`）；当前 `multi_frag` 正是这样写的，生成时须保留该模式。
- `WebGLRenderContext._drawMultiTextureBatch()` 的 shader 缓存 key 当前是固定字符串 `'multi'`，需按 N 区分。沿用现有命名约定（`multi`/`texture`/`glow`，无前缀），建议 `multi_{N}`，而非 `batch_multi_{N}`。
- ~~`WebGLVertexArrayObject.isMultiTexture()` 需适配动态 slot 数~~ — **无需改动**：`isMultiTexture()` 只返回布尔标志，与 slot 数无关；顶点布局固定 6 float（x, y, u, v, color, textureId），textureId 用一个 float 即可承载 0–15，8 槽与 16 槽布局完全相同。

**收益**：WebGL2 设备合批能力翻倍（8→16）。"draw call 减半"是上限而非典型值——仅当某绘制区间内唯一纹理数落在 9–16 时成立（≤8 已是一批次，无差异；>16 只是减少而非减半）。

**风险**：shader 变体数量从 1 个增加到 2 个（8 纹理 + 16 纹理）。如需支持更多 tier，使用编译期常量避免运行时分支。

**工期**：~1 天

---

### 2. Shader Bits 组装

**现状**：`ShaderLib.ts`（277 行）+ `ShaderLib2.ts`（294 行）两套手写 GLSL，合计约 570 行。两文件是镜像关系：同一批 shader（default_vert / fullscreen_vert / multi_vert / multi_frag / texture_frag / primitive_frag / blur_frag / blur_h_frag / blur_v_frag / glow_frag / colorTransform_frag）各写一份，差别仅在 GLSL 版本关键字（`attribute`/`varying`/`texture2D`/`gl_FragColor` vs `in`/`out`/`texture`/`fragColor`/`#version 300 es`）。每加一个 shader 概念都要在这两份文件各实现一次。

（注：blur 的 tier 变体目前已是程序化生成——`makeBlurHFrag(tier)`/`makeBlurVFrag(tier)` 及其 WebGL2 版 `…2`——而非复制粘贴；但这两个生成器本身也被复制成两份，重复问题依然存在。代码库已有 shader 生成先例，对本方案的可行性是正向信号。）

**PixiJS 做法**：`compileHighShaderGlProgram({ name, bits: [colorBit, textureBit, roundPixelsBit] })`，每个 "bit" 是一个独立的 GLSL 片段，组合时拼接。

**方案**：

```ts
// shaders/ShaderBits.ts
export interface ShaderBit {
	name: string;
	vertex?: { header: string; main: string };
	fragment?: { header: string; main: string };
}

export const colorBit: ShaderBit = {
	name: 'color',
	vertex: {
		header: 'attribute vec4 aColor; varying vec4 vColor;',
		main: 'vColor = aColor;',
	},
	fragment: {
		header: 'varying vec4 vColor;',
		main: 'gl_FragColor = vColor;',
	},
};

export const textureBit = (maxTextures: number): ShaderBit => ({
	name: `texture${maxTextures}`,
	fragment: {
		header: `uniform sampler2D uSamplers[${maxTextures}]; varying float vTextureId;`,
		main: `
            int tid = int(vTextureId + 0.5);
            vec4 texColor;
            ${Array.from(
				{ length: maxTextures },
				(_, i) =>
					`${i === 0 ? 'if' : 'else if'} (tid == ${i}) texColor = texture2D(uSamplers[${i}], vTexCoord);`,
			).join('\n')}
            gl_FragColor *= texColor;
        `,
	},
});

export function compileShaderProgram(bits: ShaderBit[]): { vertex: string; fragment: string } {
	const vertHeader = bits.map(b => b.vertex?.header ?? '').join('\n');
	const vertMain = bits.map(b => b.vertex?.main ?? '').join('\n');
	const fragHeader = bits.map(b => b.fragment?.header ?? '').join('\n');
	const fragMain = bits.map(b => b.fragment?.main ?? '').join('\n');
	// ...组装完整 shader
}
```

**收益**：

- 新增 shader 功能只需添加一个 bit，不用改现有 shader
- 消除 ShaderLib/ShaderLib2 重复代码
- WebGL1/WebGL2 差异通过不同的 bits 组合处理，不需要两套文件

**风险**：

- 生成代码的可调试性不如手写。需保留编译后的 shader 字符串用于调试（`console.log` 输出完整源码）
- WebGL1/WebGL2 差异（`varying` vs `in`/`out`，`texture2D` vs `texture`，version 指令）不能由每个 bit 自行处理，需要一个 BackendAdapter 负责 header + 关键字映射

**工期**：~2 天

---

## P2：架构增强

### 3. Pipe 注册系统

**现状**：`WebGLRenderer` 的 7 个 pipe（bitmap/graphics/mesh/text/mask/filter/
particle）在构造函数和字段初始化里直接 `new` 出来，不经过任何注册表：

```ts
this._bitmapPipe = new BitmapPipe();
this._graphicsPipe = new GraphicsPipe(this._canvasRenderer);
this._meshPipe = new MeshPipe();
this._textPipe = new TextPipe(this._canvasRenderer);
this._maskPipe = new MaskPipe(...);
private readonly _filterPipe = new FilterPipe();
private readonly _particlePipe = new ParticlePipe();
```

第三方要新增一类渲染对象（自己的 `renderObjectType` + 对应 pipe），目前唯一
的办法是要么直接修改 `WebGLRenderer` 源码加一个字段，要么走 `@kurot/spine-4.3`
现在采用的路子：**完全不新增 pipe**，让新的显示对象继承已有的 `Mesh`（或
`Bitmap`/`Shape`），复用现成的 `MeshPipe` 渲染路径（`SlotRenderer extends
Mesh`，直接写 `vertices`/`uvs`/`indices` 等公开字段）。这条路子对"几何形态
能用现有几种基元表达"的场景很好用，但如果未来要接入一种渲染方式完全不同
的对象（比如需要独立 shader/独立合批策略的类型），就只能改 `WebGLRenderer`
本身，没有干净的扩展点。

**PixiJS 做法**：`extensions.add(MeshPipe)` 之类的调用把 pipe 注册进对应
后端的扩展点（`ExtensionType.WebGLPipes` / `WebGPUPipes` / `CanvasPipes`，
每个渲染后端各有一个独立的枚举值，不是单一的通用 `RenderPipe` 类型），各
`Renderer` 启动时通过 `extensions.handleByNamedList(ExtensionType.WebGLPipes,
renderPipes)` 自动收集当前后端声明过的所有 pipe。

**方案**：

```ts
// RenderPipeRegistry.ts
export class RenderPipeRegistry {
    private _pipes = new Map<string, RenderPipe>();

    public register(pipe: RenderPipe): void {
        this._pipes.set(pipe.name, pipe);
    }

    public get(name: string): RenderPipe | undefined {
        return this._pipes.get(name);
    }

    public getAll(): RenderPipe[] {
        return Array.from(this._pipes.values());
    }
}

// WebGLRenderer.ts
public constructor(registry?: RenderPipeRegistry) {
    this._registry = registry ?? getDefaultRegistry();
    for (const pipe of this._registry.getAll()) {
        pipe.renderer = this;
    }
}
```

**默认 pipe 注册**（保持向后兼容）：

```ts
function getDefaultRegistry(): RenderPipeRegistry {
	const registry = new RenderPipeRegistry();
	registry.register(new BitmapPipe());
	registry.register(new GraphicsPipe());
	registry.register(new MeshPipe());
	registry.register(new TextPipe());
	registry.register(new FilterPipe());
	registry.register(new MaskPipe());
	registry.register(new ParticlePipe());
	return registry;
}
```

**收益**：为将来需要独立渲染路径的扩展（不能靠继承 Mesh/Bitmap 表达的对象
类型）预留一个不用改 `WebGLRenderer` 本身的接入点。目前唯一的第三方扩展
（`@kurot/spine-4.3`）走的是复用现有 `MeshPipe` 的路子，暂时没有触发这个
需求，所以这一项的优先级判断应基于"是否已有/ 预期会有需要独立 pipe 的
扩展"，不是当前的阻塞项。

**工期**：~1 天

---

### 4. 压缩纹理支持（KTX2/Basis）— 数据结构已预留，GPU 上传路径未接入

**现状**：`display/texture/BitmapData.ts` 已经有 `CompressedTextureData` 类
（`glInternalFormat`/`width`/`height`/`byteArray`/`face`/`level`）和
`BitmapData.compressedTextureData` 数组，配套
`getCompressed2dTextureData()`/`setCompressed2dTextureData()` 读写方法——
容器层面的数据结构已经存在。但 `WebGLRenderContext.getWebGLTexture()` 的
实际上传路径只调用 `gl.texImage2D(..., gl.RGBA, gl.UNSIGNED_BYTE, source)`，
从未读取 `compressedTextureData` 或调用 `gl.compressedTexImage2D`——也就是
说压缩纹理数据目前存得下但传不上 GPU，实际渲染仍然是标准 RGBA8 路径。
移动端纹理内存占用仍然是 RGBA8 的量级（4MB/1024²）。

**PixiJS 做法**：独立的 `compressed-textures/ktx2`、`compressed-textures/basis`
模块解析对应容器格式，生成的 `CompressedSource` 交给按后端区分的 uploader
（`glUploadCompressedTextureResource`/`gpuUploadCompressedTextureResource`），
uploader 内部按 mip level 遍历调用 `gl.compressedTexImage2D`，不解码到
RGBA8，直接把压缩数据传给 GPU。

**方案**（分阶段）：

**阶段 1 — 解析器**：新建 KTX2 容器解析器，把文件解析成
`CompressedTextureData[]`（已有的类型），填充进
`BitmapData.setCompressed2dTextureData()`。

**阶段 2 — GPU 上传**：`WebGLRenderContext.getWebGLTexture()` 增加分支：
若 `bitmapData.hasCompressed2d()` 为真，走
`gl.compressedTexImage2D(gl.TEXTURE_2D, level, glInternalFormat, width, height, 0, byteArray)`；
否则维持现有的 `gl.texImage2D` 路径。

**阶段 3 — 转码 polyfill**：对于不支持压缩纹理的 GPU，使用 Basis Universal 转码器在 CPU 端解码为 RGBA8 再上传。

**收益**：纹理内存占用降低 75-80%（ETC2/ASTC），移动端加载速度提升。

**风险**：

- KTX2/Basis 解析需要额外库（~50KB gzipped）
- 部分旧设备不支持压缩纹理，需要降级路径
- 建议做成可选依赖：`@kurot/core` 不含解析器，`@kurot/ktx2` 通过 Pipe 注册系统注入

**工期**：~5 天

---

## P3：长期投入

### 5. WebGPU 后端

**现状**：渲染器只支持 WebGL1/WebGL2。

**PixiJS 做法**：`GpuRenderTarget` + `GpuEncoderSystem` + `BindGroup`，通过适配器模式同时支持 WebGL 和 WebGPU。

**方案**：RenderPipe 接口已抽象，理论上每个 pipe 可有两个实现（`.webgl.ts` / `.webgpu.ts`）。`Player` 检测 WebGPU 支持后选择后端。

```ts
// 伪代码
if (navigator.gpu) {
	this._renderer = new WebGPURenderer();
} else if (checkWebGLSupport()) {
	this._renderer = new WebGLRenderer();
} else {
	this._renderer = new CanvasRenderer();
}
```

**风险**：

- WebGPU API 仍在演进；具体浏览器支持率会随时间变化，投入前应查当前
  [Can I Use](https://caniuse.com/webgpu) 数据而非依赖本文档里的旧数字
- 维护两套后端成本高
- H5 游戏场景 WebGL2 性能通常已足够

**建议**：等 WebGPU 浏览器支持率达到多数目标用户覆盖后再投入，具体阈值
需结合项目的目标平台/机型分布判断。

---

### 6. 滤镜扩展

**现状**：4 个滤镜（Blur、Glow、DropShadow、ColorMatrix）。

**PixiJS 对比**：20+ 滤镜，包括 DisplacementMap、ColorOverlay、Outline、Noise、OldFilm 等。

**方案**：按需添加。优先补充：

- `ColorOverlayFilter` — UI 按钮 hover 效果常用
- `OutlineFilter` — 文字描边
- `AdjustmentFilter`（亮度/对比度/饱和度）— 通用调色

**工期**：每个滤镜 ~0.5 天

---

### 7. 帧间顶点缓存复用

**现状**：每帧都调 `gl.bufferSubData()` 上传顶点数据。WebGL 的 draw call
必须每帧重发（GPU 不会记住上一帧画了什么），但如果场景结构和渐染数据都
没变，顶点数据本身是可以复用的，理论上能省掉一次 CPU→GPU 的数据传输。

**方案**：`InstructionSet` 维护一个内容指纹（如 CRC32）。当连续两帧
structure 未变 + `dirtyRenderableCount === 0` + 指纹一致时，跳过
`bufferSubData`，只重发 draw call。

**这条优化的价值需要先验证再投入**：`dirtyRenderableCount === 0` 意味着
没有任何对象的视觉数据发生变化，这种"完全静态"的帧在实际游戏场景里出现
频率可能很低（哪怕只有一个循环播放的小动画、一个呼吸光效、一个 UI
过渡，整帧就不再是"完全静态"）。如果这种帧确实罕见，维护指纹计算本身的
开销可能超过它节省的 `bufferSubData` 开销。建议先用 `Player.perf` 或
benchmark 场景实测"完全静态帧"在真实项目里的占比，再决定是否投入。

**工期**：~1 天（不含前置的实测验证）

---

## 汇总

| 优先级 | 项目                        | 工期          | 收益                               |
| ------ | --------------------------- | ------------- | ---------------------------------- |
| P1     | 动态纹理槽位                | 1d            | WebGL2 合批翻倍                    |
| P1     | Shader Bits 组装            | 2d            | 维护成本大降                       |
| P2     | Pipe 注册系统               | 1d            | 为未来独立渲染路径的扩展预留接入点 |
| P2     | 压缩纹理 KTX2（容器已预留） | 5d            | 移动端内存 -80%                    |
| P3     | WebGPU 后端                 | 10d+          | 未来竞争力                         |
| P3     | 滤镜扩展                    | 按需          | 表现力                             |
| P3     | 帧间顶点缓存复用            | 1d + 前置实测 | 待验证是否有实际收益               |

**建议顺序**：1 → 2 → 3 → 4，其余按需。P2 的 Pipe 注册系统优先级取决于是否
已有/预期会有需要独立渲染路径的扩展需求（目前唯一的第三方扩展
`@kurot/spine-4.3` 复用现有 `MeshPipe`，没有触发这个需求）。P3 的顶点缓存
复用应先做实测再决定是否投入，见该条目说明。

---

## TODO

- [ ] **P1-1 动态纹理槽位**（1d）— 把 `WebGLRenderContext` 已查到却被截到 8 的 `_maxTextureUnits` 提到 16 并注入 `MultiTextureBatcher`；`multi_frag` 按 N 生成 + 缓存 key 按 N 区分。WebGL2 设备 8→16
- [ ] **P1-2 Shader Bits 组装**（2d）— ShaderLib/ShaderLib2 改为 bit 组合拼接，消除双份手写 GLSL
- [ ] **P2-3 Pipe 注册系统**（1d）— `RenderPipeRegistry`，为需要独立渲染路径（无法靠继承 Mesh/Bitmap 表达）的未来扩展预留接入点
- [ ] **P2-4 压缩纹理 KTX2**（5d）— 数据结构（`CompressedTextureData`）已就位，缺 KTX2 解析器 + `WebGLRenderContext` 的 `compressedTexImage2D` 上传分支，移动端纹理内存 -80%
- [ ] **P3-5 WebGPU 后端**（10d+）— 等浏览器支持率达到多数目标用户覆盖，投入前查当前实际支持率数据
- [ ] **P3-6 滤镜扩展**（按需）— ColorOverlay / Outline / Adjustment
- [ ] **P3-7 帧间顶点缓存复用**（1d + 前置实测）— 先用 benchmark 验证"完全静态帧"在真实场景的占比，再决定是否投入 CRC32 指纹方案
