# @kurot/cli 架构文档

> 当前版本：1.0.2。逐条变更记录见 [CHANGELOG.md](../CHANGELOG.md)。
> 面向 AI 智能体的速查文档见 [ai-context.md](./ai-context.md)（目录地图、反直觉行为清单、术语表、任务→文件速查表）。本文档面向人类读者，讲设计动机与内部机制，两份文档不重复内容，互相引用。

---

## 一、概述

`@kurot/cli` 是 Kurot 游戏引擎的命令行工具，提供 Web 项目的创建、开发、构建和发布能力。它不全局安装，项目通过 `npx`（脚手架）或作为 devDependency 经 npm 脚本调用。命令基于 Commander.js，构建基于 esbuild，并内置一个 EXML → ESM 编译器。

构建过程由一组有序的 `BuildPlugin` 组成。插件共享一个 `BuildContext`（`core/pipeline.ts`），通过 `ctx.outputs` 在步骤间传递产物信息：入口脚本（`entryScript`）、编译后的皮肤模块（`skinsScript`）、引擎/自定义 namespace 的 import-map（`engine`），以及被 namespace chunk 内联的源文件清单（`namespaceModules`）。

## 二、目录结构

```text
packages/cli/
├── src/
│   ├── index.ts                       # CLI 入口，注册 4 个子命令
│   ├── define.ts                      # 纯类型重导出（ProjectConfig 等），供 kurot.config.ts 用
│   ├── commands/
│   │   ├── build.ts                   # kurot build
│   │   ├── dev.ts                     # kurot dev
│   │   ├── create.ts                  # kurot create
│   │   └── clean.ts                   # kurot clean
│   ├── core/
│   │   ├── config.ts                  # loadConfig()：读 kurot.config.ts/js，合并默认值
│   │   ├── project.ts                 # loadProject()：解析路径、依赖、自定义 namespace（#ns/<prefix>）
│   │   ├── pipeline.ts                # BuildContext / BuildPlugin / runPipeline() / disposeContext()
│   │   ├── dev-server.ts              # 静态服务器 + EXML 文件监听
│   │   ├── template.ts                # scaffoldProject()，模板列表
│   │   ├── namespace-external-plugin.ts  # 共享 esbuild 插件，防 namespace 类重复打包
│   │   ├── errors.ts                  # BuildError / ConfigError
│   │   ├── exml/                      # EXML → SkinIR → ESM 编译器
│   │   │   ├── xml-parser.ts          # 手写递归下降 XML 解析器（XElement/XText）
│   │   │   ├── registry.ts            # namespace 前缀表 + 组件标签注册表
│   │   │   ├── exml-parser.ts         # XElement → SkinIR
│   │   │   ├── ast.ts                 # SkinIR 类型定义
│   │   │   ├── codegen.ts             # SkinIR → ESM 源码（字符串拼接，非 AST）
│   │   │   └── index.ts
│   │   └── plugins/                   # 管线步骤，按数组顺序执行
│   │       ├── index.ts               # defaultPlugins()：build 命令的步骤顺序
│   │       ├── clean-output.ts        # 清空输出目录
│   │       ├── compile-exml.ts
│   │       ├── compile-engine.ts
│   │       ├── compile-custom-namespaces.ts
│   │       ├── compile-source.ts
│   │       ├── generate-html.ts
│   │       ├── manifest.ts
│   │       └── copy-assets.ts
│   └── utils/
├── templates/
│   ├── game/                          # 含资源、主题和默认皮肤
│   └── empty/                         # 仅依赖 @kurot/core
└── test/
```

## 三、构建上下文与插件顺序

标准构建顺序由 `defaultPlugins()` 定义：

```text
clean output
  ↓
compile EXML
  ↓
compile engine
  ↓
compile custom namespaces
  ↓
compile source
  ↓
generate index.html
  ↓
write manifest.json（仅 release）
  ↓
copy assets
```

各阶段职责如下：

1. `cleanOutput`：清空输出目录，因此每次构建都不是增量的（增量发生在 esbuild 的 watch 层）。
2. `compileExml`：读取主题配置，编译 EXML，并生成主题 ESM bundle。
3. `compileEngine`：把 `package.json` 中的 `@kurot/*` 运行时依赖分别打成 chunk。
4. `compileCustomNamespaces`：把 `exml.namespaces` 指定的 barrel file 分别打成 `ns.<prefix>` chunk。
5. `compileSource`：开发模式按源文件输出；发布模式生成压缩且带 hash 的应用 bundle。
6. `generateHtml`：生成 canvas、import map 和 ESM 入口脚本。
7. `writeManifest`：发布模式生成 Egret 形状的 `manifest.json`。
8. `copyAssets`：复制 `resource/`，并在启用 EXML 时跳过源主题文件和 `.exml` 文件。

顺序不能随意交换。自定义 namespace 必须先于应用源码编译，以便应用和皮肤都通过 `#ns/<prefix>` 指向同一个模块实例，避免重复打包导致类身份不一致。

## 四、模块拆分与 import map

CLI 不会生成单一的自包含文件。引擎、项目 namespace、主题和应用代码分别构建：

```text
@kurot/core ───────────────→ js/kurot.core[.min_<hash>].js
@kurot/ui ─────────────────→ js/kurot.ui[.min_<hash>].js
src/ui/index.ts ─────────────→ js/ns.game[.min_<hash>].js
resource/**/*.exml ──────────→ js/default.thm[.min_<hash>].js
src/Main.ts ─────────────────→ Main.js 或 js/main.min_<hash>.js
```

HTML import map 将 `@kurot/*` 和 `#ns/*` 裸 specifier 映射到对应 chunk。应用 bundle、引擎 bundle和皮肤 bundle因此共享相同的模块实例。

## 五、产物结构

### Development

默认输出目录为 `bin-debug/`，可通过 `output.dir` 修改：

```text
bin-debug/
├── index.html
├── Main.js
├── LoadingUI.js
├── js/
│   ├── kurot.core.js
│   ├── kurot.game.js
│   ├── kurot.ui.js
│   ├── ns.game.js                 # 仅配置自定义 namespace 时存在
│   └── default.thm.js             # 仅启用 EXML 且找到皮肤时存在
└── resource/
    ├── default.res.json
    ├── default.thm.json           # skins 映射 + skinsJs
    └── ...                        # 不包含已编译的 .exml
```

开发模式会为 `src/**/*.ts` 创建保持相对目录的 ESM 输出。已被自定义 namespace chunk 打包的源码不会再次作为独立入口输出。

### Release

发布输出固定在 `bin-release/web/<YYMMDDHHmmss>/`：

```text
bin-release/web/260806143805/
├── index.html
├── manifest.json
├── js/
│   ├── kurot.core.min_<hash>.js
│   ├── kurot.game.min_<hash>.js
│   ├── kurot.ui.min_<hash>.js
│   ├── ns.game.min_<hash>.js       # 可选
│   ├── default.thm.min_<hash>.js   # 可选
│   └── main.min_<hash>.js
└── resource/
    ├── default.res.json
    ├── default.thm.json
    └── ...
```

`manifest.json` 的 `initial` 包含引擎和自定义 namespace chunk，`game` 包含主题脚本（存在时）和应用入口。浏览器实际启动仍由 `index.html` 中的 ESM 入口完成。

## 六、命令与监听模型

### `kurot build`

```text
kurot build [-r|--release] [--sourcemap] [--watch] [--analyze]
```

- 默认执行 development build。
- `--release` 开启压缩、hash 文件名和 release 目录。
- `--watch` 始终使用 development 模式；与 `--release` 同时使用时会忽略 release。
- `--analyze` 输出 release 应用 bundle 的 esbuild 分析。

### `kurot dev`

```text
kurot dev [-p|--port <port>] [--sourcemap]
```

执行开发构建并启动静态服务器。esbuild 监听应用源码和自定义 namespace；`resource/` 监听器在 `.exml` 变化时重新编译主题并复制资源。引擎依赖或其他静态资源变化后应重新启动 dev server。当前没有浏览器自动刷新，需要手动刷新页面。

### `kurot create` 与 `kurot clean`

- `kurot create <name> [--template game|empty]` 创建项目，并把 CLI 固定为当前版本；运行时包优先解析 npm 最新版本，registry 不可用时保留 `latest`。
- `kurot clean` 删除 `bin-debug` 和 `bin-release`。

## 七、配置模型

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
		namespaces: {
			game: 'src/ui/index.ts',
		},
	},
};
```

配置文件可以是 `kurot.config.ts` 或 `kurot.config.js`。未提供配置文件时使用默认值；用户配置会与默认 `stage` 配置合并。当前只支持 `html5` target。

## 八、EXML 编译

EXML 管线为：

```text
XML source → XElement tree → SkinIR → per-skin ESM factory
           → esbuild theme bundle → globalThis skin registration
```

主题输入兼容 Egret 常见字段：

- `skins` 的值可以是 EXML 路径或皮肤类名；
- `autoGenerateExmlsList: false` 配合非空 `exmls` 时按显式列表编译；
- 其他情况递归扫描 `resource/**/*.exml`。

输出主题删除 `exmls` 和 `autoGenerateExmlsList`，将可解析的皮肤路径改写为类名，并加入相对于主题 JSON 的 `skinsJs` 路径。

编译器支持常用组件、属性节点、百分比尺寸、数据绑定、根 Skin 属性、`<eui:states>`、states 简写、状态属性、`includeIn` 和 `excludeFrom`。内置 namespace 按前缀解析；`http://ns.egret.com/eui` 只是 XML namespace 标识符，不会发起网络请求。

当前解析器面向 EXML 子集，不支持 DTD、ENTITY 和带 namespace 的属性。未知组件会被警告并丢弃，单个皮肤编译失败时会生成空工厂并继续构建，因此迁移大型 Egret 项目时应检查全部构建警告和页面行为。
