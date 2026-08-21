# 渲染架构基准测试方案

本方案的目的不是"跑分好看",而是**用可复现的数字证明 InstructionSet / RenderGroup / 两级脏标记 /
多纹理批处理这几项改动是真实的优化,不是技术炫耀**。每一项都给出:它声称什么 → 怎么构造场景 →
量什么 → 什么样的结果才算"优化成立"。

## 0. 可用的基础设施(已存在,直接复用)

不要从零搭测试框架。`@kurot/core` 已有共享场景、引擎适配器和浏览器自动化设施:

- **`ScenarioDefinition`**(`examples/benchmark/Scenarios.ts`):Kurot、PixiJS 与 Egret 共用的场景抽象。
  ```ts
  interface ScenarioDefinition {
    id: string;
    version: number;
    defaultCount: number;
    build(adapter: BenchmarkAdapter, count: number, seed: number): ScenarioRuntime;
  }
  ```
  新的跨引擎测试应只定义一次场景,通过 `BenchmarkAdapter` 执行创建、变更和销毁。随机输入必须使用
  协议提供的固定种子,不能直接调用 `Math.random()`。
- **`BenchmarkComparison.ts`**:按固定 warmup 与测量帧数运行场景,并通过页面状态暴露机器可读结果。
- **`examples/benchmark/tests/comparison.spec.ts`**:在独立页面中重复运行 Kurot、PixiJS、Egret 和受支持后端矩阵,
  保存原始 JSON,并以中位数和区间生成对比报告。
- **`DrawCallCounter`**(`examples/benchmark/DrawCallCounter.ts`):统一拦截三个适配器实际调用的
  `gl.drawArrays` / `gl.drawElements`,避免使用各引擎含义不同的内部 draw-call 统计。
- **`Player.perf`**(`player/Player.ts`):每帧可读 `renderTimeMs`、`fps` 等 Kurot 内部指标。
- **`MetricsCollector` → `Stats`**:分别给出 FPS、整帧时间和渲染调用时间的分位数、`drawCalls.avg`、
  `batchEfficiency`(= `objectCount / drawCalls`,每 draw call 平均渲染对象数,越高批得越好)。
- **`ReportExporter`**:把带协议、引擎、后端、分辨率、种子和运行模式信息的 `ReportData` 导出。

关键事实:**`renderTimeMs` 是整段 `renderer.render()`(build + execute 合并),没有单独的 build/execute
计时**。因此"分阶段成本"这一项要么读源码加临时打点,要么用结构变化 vs 数据变化的对照来推断(见测试 2)。

---

## 1. RenderGroup 静态子树隔离

**声称**:静态子树包进 `isRenderGroup = true` 后,每帧零 JS 遍历,执行阶段直接复用其 InstructionSet;
它的每帧成本与子树对象总数无关。

**场景**(`build`):在 container 里放 N 个**完全静态**的 Bitmap(N = 200 / 1000 / 5000),全部塞进一个
`isRenderGroup = true` 的容器;另放 2 个每帧移动的角色(制造 renderDirty)。warmup 后保持画面静止。

**对照**:同一个场景跑两遍——`isRenderGroup = true` vs `false`。

**测什么**:`Player.perf.renderTimeMs` 的 p95(稳态每帧渲染耗时),随 N 变化的曲线。

**优化成立的判据**:
- `isRenderGroup = true` 时,renderTimeMs 随 N **几乎不变**(只跟 2 个角色挂钩);
- `isRenderGroup = false` 时,renderTimeMs 随 N **线性增长**;
- 两组的差值随 N 增大而拉开。

这证明"静态子树零遍历"是真的,且收益随对象数放大——而不是一句无法验证的口号。

---

## 2. 两级脏标记:renderDirty 是 O(1) patch,不重建

**声称**:只改位置/透明度/纹理(`renderDirty`)走 O(1) 局部 patch(经 `renderableIndex` 定位指令槽),
不重建整个 InstructionSet;只有结构变化(`structureDirty`)才全量重建。

**场景**:N 个对象(N = 500 / 2000 / 8000)的场景,稳态后分两种每帧行为:
- (a) **只移动**一个对象(触发 renderDirty);
- (b) **增删**一个对象(触发 structureDirty)。

**对照**:(a) vs (b),同样 N。

**测什么**:`renderTimeMs` 的 p95。(a) 应近似常数、且远小于 (b)。

**优化成立的判据**:
- (a) 的 renderTimeMs 随 N **基本不变**(patch 一个对象,跟总数无关);
- (b) 的 renderTimeMs 随 N **增长**(要重建);
- 同一个 N 下 (a) ≪ (b)。

**注意**:`renderTimeMs` 合并了 build+execute,(b) 的高耗时来自 build 重建。若要精确分离两阶段成本,
在 `WebGLRenderer.render()` 的 build 调用前后加 `performance.now()` 临时打点即可——这是读源码加两行
计时,不是改架构。

---

## 3. 多纹理批处理:draw call 随纹理数成 ⌈N/8⌉,不是线性 N

**声称**:同一批内纹理数 ≤ 8 即可合批;draw call 数 ≈ ⌈唯一纹理数 / 8⌉,而非对象数 N。

**场景**:M 个 Bitmap,每个绑一张**互不相同**的纹理(M = 1 / 4 / 8 / 9 / 16),都是纯 quad、无 filter/mesh。

**对照**:可选——把其中一些挂上 GlowFilter(会打断批),看 drawCall 是否回升。

**测什么**:`Player.perf.drawCalls`(稳态值)和 `batchEfficiency`。

**优化成立的判据**:
- M ≤ 8 时 drawCalls = 1;
- M = 9 时 drawCalls = 2,M = 16 时 drawCalls = 2;
- 曲线呈阶梯(每跨过 8 的倍数 +1),而不是随 M 线性上升。
- 挂 filter 的对象会让该对象单独 flush,drawCalls 相应 +1。

这直接坐实"多纹理合批"在唯一纹理多时减少 draw call——而唯一纹理少(单图集)时它本来就 1 个 draw call,
没有额外吹嘘的空间(见 §4 风险)。

---

## 4. 关于"对比 Egret"——诚实的处理

这些测试**默认不依赖 Egret**。这是刻意的:同一台机器上跑两套引擎,运行时/驱动/时间差异会污染绝对数字,
"比 Egret 快 X 倍"这种标题反而不可信。

本方案用的是**更有说服力的对照组**——Kurot 内部的"开/关"对照(RenderGroup on/off、renderDirty vs
structureDirty、有/无 filter)。同一个引擎、同一帧、只翻转一个开关,差值就干净地归因于那项架构改动本身。
这比跨引擎绝对值更能证明"这个改动是真优化,不是炫技"。

如果确实想要一个 Egret 绝对基线,把它当作**可选的补充**而非主证据:在 Egret 里搭等价场景测同一指标,
结论表述为"同场景下 X 指标的量级对比",并明确标注运行环境——而不是宣称确定的倍数。

---

## 5. 落地步骤(给实现者)

1. 在 `examples/benchmark/Scenarios.ts` 增加场景定义;若需要新能力,同时在三个 engine adapter
   增加语义等价操作。仅用于 Kurot 架构验证的场景必须明确标为 Kurot-specific,不能混入等价性排名。
2. 每个场景按"对照"要求跑两组(开关 / 行为),各取 warmup 后的固定帧窗口统计。
3. 用 `pnpm --dir packages/core benchmark:compare` 生成原始报告和中位数汇总。
4. 汇总成一张"场景 × 对照组 × 指标"的表。判据见各节。
5. **测前先确认没有 vsync 把 fps 钉死在 60**——当 fps 已被 vsync 封顶时,用 `renderTimeMs`(CPU 侧)
   而非 fps 判断优化,否则看不出差别。这是最容易踩的坑。

## 6. 一句话目标

跑完这组测试,应当能指着每一行数字说:**"关掉这个特性,这个数字就变差;开着,它就好。所以这个改动
是有收益的。"**——这就是"不是炫技"的证据。
