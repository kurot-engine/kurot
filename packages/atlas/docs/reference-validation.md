# basis / basis_icon 格式与像素验证

验证日期：2026-10-07（Asia/Shanghai）。实现：本地 `@kurot/atlas 0.1.0`。
参考项目：`CrashMaster/kurot-project-kui`，采用本次更新后的原图与 TexturePacker 产物。

## 结论

两组共 61 个资源的名称、帧字段、裁剪尺寸、偏移、原始尺寸和像素均通过验证。
新产物可以采用现有资源格式；不需要修改 KUI、资源清单或 Core 的图集解析。
排布坐标有所不同，PNG 和 JSON 必须成对替换。格式兼容不代表产物字节相同。

| 项目 | basis | basis_icon |
| --- | --- | --- |
| 原图 / 帧数 | 29 / 29 | 32 / 32 |
| 发生裁剪 | 0 | 32 |
| TexturePacker 图集 | 1024 × 1024 | 256 × 512 |
| atlas 图集 | 1024 × 1024 | 256 × 512 |
| 有效帧矩形总面积，不含扩边 | 728,044 px | 97,021 px |
| 排布坐标不同的帧 | 26 | 32 |
| TexturePacker PNG 大小 | 875,190 bytes | 158,473 bytes |
| atlas PNG 大小 | 909,753 bytes | 159,652 bytes |

新 PNG 分别大约多 3.95% 和 0.74%。当前没有图集面积或 GPU 纹理内存收益。
PNG 字节大小由排布与编码共同影响，不能把差异全部归因于压缩器。
本次没有进行稳定的性能基准，也没有启动浏览器做交互或截图验收。

## 参考材料与配置

- 原图：`ui-tps/src/basis/*.png`、`ui-tps/src/basis_icon/*.png`。
- 参考：`ui-tps/export/r_basis.{json,png,tps}`、`r_basis_icon.{json,png,tps}`。
- 项目使用的资源：`resource/assets/ui/app/r_basis.{json,png}`、`r_basis_icon.{json,png}`。
  两组运行时 PNG、JSON 与 export 文件均逐字节相同。
- TexturePacker 8.3 的 Egret 导出：单图集、无旋转、POT、允许矩形、最大 2048²、
  缩放 1、RGBA8888 PNG、alpha threshold 1、trim margin 1、extrude 1、
  shape/border padding 0、清除完全透明像素的 RGB。开启 auto-alias，但这两组没有别名帧。

本次 atlas 使用默认打包选项，只显式指定对应 PNG 文件名。
库没有读取 `.tps`，验证范围是上述实际配置与两组资源。

## 校验覆盖

`scripts/verify-reference.ts` 和 `scripts/reference-checks.ts` 执行：

1. 原图名称与参考 JSON 的帧集合完全相同。
2. JSON 使用 `file` + `frames`；每帧是整数 `x/y/w/h` 与可选
   `offX/offY/sourceW/sourceH`，没有旋转或嵌套格式。
3. 参考 PNG 与新 PNG 均为 8-bit RGBA；帧与 1 px 扩边在图集边界内，扩边矩形不重叠。
4. 独立计算原图 alpha ≥ 1 的包围盒，加 1 px margin 后夹到原图边界；
   对参考、新产物分别验证裁剪。裁掉的区域没有非零 alpha。
5. 按 offX/offY 将每帧放回原始画布，逐通道核对所有保留像素；
   完全透明像素的 RGB 按 0 核对，非零 alpha 像素的 RGBA 必须精确相同。
6. 逐像素核对四边和四角的 1 px extrusion。
7. 新旧帧除了 x/y，其他字段的值和字段是否存在都完全相同。
8. 反转输入顺序后，新 PNG 字节和 JSON 对象保持一致。
9. 报告保留源图和参考产物的 SHA-256，供后续原图更新时识别验证基线。

例如 `r_icon_bars` 裁剪为 56 × 43，offX/offY 为 6/11，逻辑尺寸仍是 64 × 64。
基础资源 `r_bg_stepper` 为 180 × 60，`r_txt_input` 为 140 × 60。

TexturePacker 的顶层 `meta` 不由新库生成；Core 的 SheetAnalyzer 不读取它。
`meta.smartupdate` 属于 TexturePacker 更新信息，不能保留旧值冒充新产物。

## CLI 实际构建验证

在项目临时副本中使用样例已安装的 CLI 3.3.0，先构建原始图集，再仅替换两组 PNG/JSON。
两次 development `build --strict` 和替换后的 `build --release --strict` 均成功，
每次编译 66 个 KUI skin。没有修改真实示例项目。

- 66 个 authored KUI、`default.res.json` 和 `style.json` 与原项目逐字节相同。
- development 编译的 `default.thm.js` 在归一化 CLI 随机临时目录名后完全相同；
  原始字节比较会因 `kurot-skins-<random>` 的生成来源注释不同而失败。
- development 和 release 中的四个新图集资源均与打包结果逐字节相同。
- 构建验证证明现有编译和复制链可接收这些产物；逐帧像素校验与 Core 源码契约
  支持裁剪/偏移兼容判断，未执行浏览器资源加载测试。

使用已安装的 CLI 入口直接调用 `node node_modules/@kurot/cli/dist/index.js ...`。
临时副本中的 `pnpm exec` 尝试检查依赖，并因新发布的 CLI/ui-document 未满足
minimumReleaseAge 而失败；没有放宽策略、重新安装或更换依赖。

## 重复验证

从引擎仓库根目录运行，第二个参数必须是尚不存在、且位于示例项目外的目录：

```sh
pnpm --dir packages/atlas verify:reference \
  /path/to/CrashMaster/kurot-project-kui \
  /tmp/kurot-atlas-reference-new
```

脚本只读示例项目，在新目录输出两组 PNG/JSON 和 `report.json`；失败会以非零码退出。
它是本地参考验证工具，不依赖固定的开发者路径，不纳入默认 CI 测试，也不发布脚本。
基线文件更新后需要重新执行，旧报告不能证明新文件通过验证。

本次本地产物位于 `/private/tmp/kurot-atlas-reference-20261007`，另有
`cli-report.json` 记录临时项目的构建核对结果。这些临时文件不随包分发。
后续接入与优化见 [cli-integration.md](./cli-integration.md)。
