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

**现状**：`MultiTextureBatcher.MAX_TEXTURES` 硬编码为 8，注释写明"WebGL1 最小保证值"。WebGL2 设备实际支持 16+，浪费了一半合批能力。

**PixiJS 做法**：`getMaxTexturesPerBatch()` 从 GPU 查询 `MAX_TEXTURE_IMAGE_UNITS`，动态决定批处理槽位数。

**方案**：

```ts
// MultiTextureBatcher.ts
export class MultiTextureBatcher {
	// 移除硬编码
	// public static readonly MAX_TEXTURES = 8;

	private readonly _maxTextures: number;

	public constructor(gl: GL) {
		this._maxTextures = Math.min(
			gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) as number,
			16, // 安全上限，避免 shader 过大
		);
		this.slots = new Array(this._maxTextures);
	}

	public get maxTextures(): number {
		return this._maxTextures;
	}
}
```

**联动**：

- `ShaderLib.makeMultiTextureFrag(maxTextures)` 接受参数，不再硬编码 `uniform sampler2D uSamplers[8]`
- `WebGLVertexArrayObject` 的 `isMultiTexture()` 检查需适配动态 slot 数
- `_drawMultiTextureBatch` 的 shader 缓存 key 改为 `batch_multi_{N}`

**收益**：WebGL2 设备合批能力翻倍（8→16），复杂场景 draw call 减半。

**风险**：shader 变体数量从 1 个增加到 2 个（8 纹理 + 16 纹理）。如需支持更多 tier，使用编译期常量避免运行时分支。

**工期**：~1 天

---

### 2. Shader Bits 组装

**现状**：ShaderLib.ts + ShaderLib2.ts 两套手写 GLSL，约 300 行。每加一个 shader 变体都要复制粘贴修改。

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

### 4. Pipe 注册系统

**现状**：`WebGLRenderer` 构造函数硬编码 7 个 pipe：

```ts
this._bitmapPipe = new BitmapPipe();
this._graphicsPipe = new GraphicsPipe();
this._meshPipe = new MeshPipe();
// ...
```

第三方扩展（如 `@kurot/spine-4.3`）无法注入自己的 pipe。

**PixiJS 做法**：`ExtensionType.RenderPipe` + `extensions.add(BitmapPipe)`，渲染器启动时自动发现所有 pipe。

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

**收益**：`@kurot/spine-4.3` 可注册 `SpinePipe`，不再需要 hack 核心代码。

**工期**：~1 天

---

### 5. 压缩纹理支持（KTX2/Basis）— 数据结构已预留，GPU 上传路径未接入

**现状**：`display/texture/BitmapData.ts` 已经有 `CompressedTextureData` 类
（`glInternalFormat`/`width`/`height`/`byteArray`/`face`/`level`）和
`BitmapData.compressedTextureData` 数组，配套
`getCompressed2dTextureData()`/`setCompressed2dTextureData()` 读写方法——
容器层面的数据结构已经存在。但 `WebGLRenderContext.getWebGLTexture()` 的
实际上传路径只调用 `gl.texImage2D(..., gl.RGBA, gl.UNSIGNED_BYTE, source)`，
从未读取 `compressedTextureData` 或调用 `gl.compressedTexImage2D`——也就是
说压缩纹理数据目前存得下但传不上 GPU，实际渲染仍然是标准 RGBA8 路径。
移动端纹理内存占用仍然是 RGBA8 的量级（4MB/1024²）。

**PixiJS 做法**：`CompressedTextureResource` + `KTXParser` / `BasisParser`，加载时解析压缩纹理容器，直接上传到 GPU 不解码。

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

### 6. WebGPU 后端

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

- WebGPU API 仍在演进，当前浏览器支持率 ~30%
- 维护两套后端成本高
- H5 游戏场景 WebGL2 性能已足够

**建议**：等待 WebGPU 浏览器支持率 > 70% 后再投入。

---

### 7. 滤镜扩展

**现状**：4 个滤镜（Blur、Glow、DropShadow、ColorMatrix）。

**PixiJS 对比**：20+ 滤镜，包括 DisplacementMap、ColorOverlay、Outline、Noise、OldFilm 等。

**方案**：按需添加。优先补充：

- `ColorOverlayFilter` — UI 按钮 hover 效果常用
- `OutlineFilter` — 文字描边
- `AdjustmentFilter`（亮度/对比度/饱和度）— 通用调色

**工期**：每个滤镜 ~0.5 天

---

### 8. 帧间顶点缓存复用

**现状**：每帧都调 `gl.bufferSubData()` 上传顶点数据，即使场景完全静态。Canvas 每帧被浏览器清掉所以 draw call 必须重发，但顶点数据可以复用。

**方案**：`InstructionSet` 维护 CRC32 指纹。连续两帧 structure 没变 + dirtyRenderableCount === 0 + 指纹一致 → 跳过 `bufferSubData`。

**局限**：任何动画/tween/滚动都会让 dirtyRenderableCount > 0，优化失效。仅对完全静态 UI 有效。

**工期**：~1 天

---

## 汇总

| 优先级 | 项目                        | 工期 | 收益               |
| ------ | --------------------------- | ---- | ------------------ |
| P1     | 动态纹理槽位                | 1d   | WebGL2 合批翻倍    |
| P1     | Shader Bits 组装            | 2d   | 维护成本大降       |
| P3     | 帧间顶点缓存复用            | 1d   | 静态 UI 省上传带宽 |
| P2     | Pipe 注册系统               | 1d   | 扩展性             |
| P2     | 压缩纹理 KTX2（容器已预留） | 5d   | 移动端内存 -80%    |
| P3     | WebGPU 后端                 | 10d+ | 未来竞争力         |
| P3     | 滤镜扩展                    | 按需 | 表现力             |

**建议顺序**：1 → 4 → 2 → 5，其余按需。

---

## TODO

- [ ] **P1-1 动态纹理槽位**（1d）— `MultiTextureBatcher.MAX_TEXTURES` 改为从 GPU 查询，WebGL2 设备 8→16
- [ ] **P1-2 Shader Bits 组装**（2d）— ShaderLib/ShaderLib2 改为 bit 组合拼接，消除双份手写 GLSL
- [ ] **P2-4 Pipe 注册系统**（1d）— `RenderPipeRegistry`，`@kurot/spine-4.3` 可注入 `SpinePipe`
- [ ] **P2-5 压缩纹理 KTX2**（5d）— 数据结构（`CompressedTextureData`）已就位，缺 KTX2 解析器 + `WebGLRenderContext` 的 `compressedTexImage2D` 上传分支，移动端纹理内存 -80%
- [ ] **P3-6 WebGPU 后端**（10d+）— 等浏览器支持率 > 70%
- [ ] **P3-7 滤镜扩展**（按需）— ColorOverlay / Outline / Adjustment
- [ ] **P3-8 帧间顶点缓存复用**（1d）— CRC32 指纹，静态 UI 跳过 bufferSubData
