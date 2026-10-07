# 图集与 CLI 的接入及优化建议

状态：2026-10-07 的源码分析与样例验证。本文是后续方案；本次没有改动 CLI、Core、
Editor 或 Reskin，也没有添加消费者依赖。

## 当前链路

```text
原图 → @kurot/atlas → PNG + 图集 JSON
                       ↓ 调用方保存
resource/default.res.json → CLI 读取资源默认值 → 编译 KUI
resource/ 下的 PNG/JSON   → CLI copyAssets      → 构建输出
构建输出的图集 JSON/PNG   → Core SheetAnalyzer → SpriteSheet / Texture
```

CLI 没有在编译 KUI 时解析图集的帧坐标或 PNG。
`src/core/kui/skin-module-builder.ts` 读取 `default.res.json`，通过 ui-document 的
`parseUIResourceConfigEntries` 获得资源和九宫格默认值；`kui-parser.ts` 在副本上依次
应用资源默认值、Label presets 和颜色。`plugins/copy-assets.ts` 复制 resource，
排除 authored KUI 和生成的主题文件。

Core 的 `packages/core/src/kurot/resource/analyzers/SheetAnalyzer.ts` 在运行时读取
`file/frames`，将裁剪坐标、偏移和原始尺寸交给 `SpriteSheet.createTexture`。
因此本次格式兼容已经足够，无需为了接入库改造 CLI 的 KUI parser 或 Core。

atlas 保持独立；Reskin/Editor 的资源服务可以调用库。以后若 CLI 提供打包功能，
CLI 可依赖 atlas，但 atlas 不依赖 CLI/Core。单纯复制、消费已打包图集无需新增依赖。

## 第一优先级：资源更新能够到达预览

后续进展：CLI 工作树已补充全 resource 监听、成批同步、删除处理和 no-store；
CLI 3.3.1 已发布；已安装的 CLI 3.3.0 没有这些能力，需要更新项目依赖与锁文件。
以下缺口记录的是分析时的旧实现；当前实现和成组更新限制见
[CLI 资源监听](../../cli/docs/dev-resource-watching.md)。严格 PNG/JSON 事务仍是后续工作。

CLI `src/core/dev-server.ts` 的 `watchResources` 目前仅响应 `.kui.xml`、
`default.res.json` 和 `config/style.json`，并且要求项目配置 `ui`。
PNG 与普通图集 JSON 的修改不会触发此监听器。完整 build 能复制新产物，
但运行中的 dev 服务可能继续提供旧资源。这是源码确认的缺口，尚未做运行中 watcher 验收。

建议增加资源变化分支：

| 变化 | 建议动作 |
| --- | --- |
| 图集 PNG / 帧 JSON，资源名称和九宫格不变 | 校验成对产物、复制资源、通知预览重新加载 |
| default.res.json 中资源默认九宫格变化 | 校验清单、重新编译受影响 KUI、复制资源 |
| style.json 中颜色 / 字体 / Label presets 变化 | 继续使用既有样式副本解析链和 KUI 重编译 |
| KUI 变化 | 保持既有编译流程；Reskin 不提供这个编辑入口 |

第一版可复用现有 copyAssets，先保证正确性；后续再只复制变化文件。
资源监听不应绑定 ui 存在，Core-only 项目也需要复制变化的资源。
无需通过修改或 touch KUI/default.res.json 伪造更新事件。

PNG 和 JSON 各自 rename 并不构成双文件原子事务。调用方应先生成并验证临时产物，
再提交一整组；同进程用提交完成事件串行触发复制。外部文件监听可采用去抖与有界重试，
但它们不能严格保证同尺寸 PNG/JSON 是同一代。需要跨进程严格一致时，考虑版本目录
加一次性指针切换，或显式 commit 标记/代次协议；该方案应独立评审。
只有成组验证和复制完成后才发布成功事件。预览刷新还要处理 Core 资源缓存和浏览器缓存；
第一阶段整页重载比只清除一个子纹理可靠，不应向产物 JSON 塞入未定义缓存字段。

## 第二优先级：构建前资源完整性校验

增加独立校验步骤，位于编译/复制前，不改变 authored KUI：

- 清单中的 sheet URL 指向存在的 JSON；JSON 的 file 指向合法、存在的相对 PNG。
- PNG 尺寸、frame 整数与边界、裁剪偏移及逻辑尺寸一致，拒绝不支持的旋转格式。
- `subkeys` 继续使用对象格式；对照实际 frame 集合报告缺失/多余条目，
  严格模式下对引用不到的帧失败，错误包含 sheet 名、资源路径和 frame 名。
- 资源默认 `scale9grid` 按未裁剪的 sourceW/sourceH 校验，不能按图集 x/y 或裁剪 w/h 重算。
- 沿用现有名称/别名优先级，区分重复裸帧名和可使用的 `sheet.frame` 引用。

相关契约见 `packages/ui-document/docs/resource-nine-slice.md`。
现有清单解析器不读取 PNG/帧文件，因此不能把它通过解析视为完整的图集校验。
新增纯格式检查可放在独立工具模块；不要仅为读取已有图集强迫 Core 或 ui-document 依赖 atlas。
若将来共享读取校验器，可提供不含 PNG 编码器的独立入口，再评估 CLI 是否需要依赖。

Reskin 默认保持资源键集合，按已有键替换素材。重打包不需要重新生成整份清单。
保留 frame 的既有九宫格和未知元数据、groups、URL 与资源顺序；出现键集合变化时先报告，
不能静默删除或重写已有引用。不得自动调整皮肤、布局或把局部字段迁移成 presets。

## 第三优先级：增量处理和可选打包入口

先按源图内容指纹、规范化 options、库版本缓存产物，命中后跳过解码/打包/编码。
不同原图路径顺序不影响输出，已有确定性校验覆盖这一点。
CLI 可以在一次构建中只读取一次清单和每个相关 sheet，建立资源索引，避免多皮肤重复 I/O。
坐标变化不影响 KUI 编译；默认九宫格或样式变化才影响生成代码。
按资源/样式到皮肤的依赖关系减少编译，需要先完善引用追踪和删除事件测试。

若 CLI 增加 opt-in pack 插件，顺序建议为：
`配置校验 → 打包 → 成组校验/提交 → KUI 编译 → copyAssets`。
输入配置需要显式 source/output、稳定资源名、打包选项，禁止依靠扫描结果猜测既有资源键。
通用 CLI 项目不因已有 PNG/JSON 就自动重打包；其余消费者仍直接调用同一 atlas API。
工具拥有路径、文件提交、队列/worker 与进度；库继续只返回内存结果。

## 图集本身的优化空间

两组新图集与 TexturePacker 面积相同，优先优化更新链路与诊断。
可以试验 PNG filter/deflate 设置、替代无损编码器与不同 MaxRects 排序组合，
同时记录耗时、PNG 字节、图集面积和内存峰值。以多组资源基准选择策略，
每种策略必须重新通过 RGBA 与裁剪/扩边校验；减少 PNG 字节不等于减少 GPU 内存。

重复像素别名在当前两组里无收益；旋转和 multipack 会扩大 Core/清单/工具契约，
不作为当前格式一致目标的优化。不可用有损量化、丢弃低 alpha 或减少 margin/extrusion
换取大小优势并继续声称与当前像素契约一致。

## 建议验收顺序

1. 保留 `verify:reference` 基线，先完成 Reskin/Editor 的成组替换与整页预览刷新。
2. CLI 验收 dev 下仅替换 PNG/JSON、删除资源、外部提交中途失败和 Core-only 项目资源更新。
3. 验收九宫格逻辑尺寸、裁剪图标、manifest 不变、KUI 未修改、现有 preset 引用不变。
4. 再引入输入缓存、增量复制或 opt-in CLI 打包，分别测量改善和测试失败回滚。

本次兼容性证据见 [reference-validation.md](./reference-validation.md)。
