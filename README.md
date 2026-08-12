# Kurot

Kurot 是一个面向 Web 的 2D 游戏引擎，基于 **TypeScript、ESM 与 ES2022** 对 Egret 引擎进行现代化重写。它保留 Egret 风格的显示对象、事件、图形、EUI 与 EXML 使用体验，同时采用基于指令的渲染架构：先构建扁平指令集，再由各渲染管线执行绘制。

核心特性包括：

- Egret 风格的 `DisplayObject`、事件、几何、图形、资源与媒体 API。
- 以 **Build → Execute** 为核心的渲染流程，以及 WebGL 多纹理批处理和 RenderGroup 分层。
- WebGL 主渲染后端与 Canvas 2D 降级后端。
- EUI 兼容的组件、布局、状态、数据绑定和主题系统。
- 构建期 EXML → ESM 编译，运行时无需解析 XML。
- Tween、MovieClip、ScrollView、URLLoader 和 Spine 4.3 支持。

> **命名说明：** npm 包已迁移至 `@kurot/*`。CLI、配置文件和源码路径中的历史 `blakron` 标识将在后续迁移步骤中统一处理。

## 包与依赖

Kurot 由多个独立维护的 pnpm 包组成。仓库根目录目前没有 `pnpm-workspace.yaml` 或统一的根级构建脚本，请在对应包目录中安装依赖和执行命令。

| 包 | 路径 | 职责 | 内部依赖 |
| --- | --- | --- | --- |
| [`@kurot/core`](packages/core/README.md) | `packages/core` | 显示对象、渲染、事件、几何、文本、资源、网络和媒体等引擎基础能力 | 无 |
| [`@kurot/ui`](packages/ui/README.md) | `packages/ui` | EUI 兼容的 UI 组件、布局、皮肤、主题与数据绑定 | `@kurot/core` |
| [`@kurot/game`](packages/game/README.md) | `packages/game` | Tween、MovieClip、ScrollView、URLLoader 等游戏扩展 | `@kurot/core` |
| [`@kurot/spine-4.3`](packages/spine-4.3/README.md) | `packages/spine-4.3` | 基于 Spine 4.3 的骨骼动画适配运行时 | `@kurot/core` |
| [`@kurot/cli`](packages/cli/README.md) | `packages/cli` | Node.js 构建工具、项目脚手架与 EXML 编译器 | 无 |

依赖方向保持单向：`core` 是基础包；`ui`、`game` 和 `spine-4.3` 只依赖 `core`，彼此不依赖；`cli` 是纯构建期工具，不会被引入浏览器运行时。

```text
@kurot/core
 ├─ @kurot/ui
 ├─ @kurot/game
 └─ @kurot/spine-4.3

@kurot/cli  (build-time only)
```

## 快速开始

### 环境要求

- Node.js 20 或更高版本
- pnpm 10.33.0
- 支持 ES2022 与 ESM 的现代浏览器环境

### 安装、构建与测试单个包

所有包都独立安装依赖。以下示例以核心包为例：

```sh
pnpm --dir packages/core install
pnpm --dir packages/core build
pnpm --dir packages/core test
```

将 `core` 替换为 `cli`、`ui`、`game` 或 `spine`，即可对相应包执行安装和构建：

```sh
pnpm --dir packages/<package> install
pnpm --dir packages/<package> build
```

`core`、`cli`、`ui` 和 `game` 提供一次性测试命令：

```sh
pnpm --dir packages/<package> test
```

`spine` 当前没有测试脚本。各包均可通过下列命令启动 TypeScript 编译监听：

```sh
pnpm --dir packages/<package> dev
```

### 使用本地 CLI

在不发布包的情况下，可通过 CLI 包直接调用源码入口：

```sh
pnpm --dir packages/cli blakron -- <command>
```

CLI 提供项目创建、构建、开发服务与清理等能力。生成的项目继续使用 `blakron` 命令和 `blakron.config.ts` 配置文件，以保持与当前发布包的兼容。

## 架构概览

### 渲染管线

`@kurot/core` 使用两阶段渲染：

1. **Build**：遍历场景图并生成扁平的 `InstructionSet`，而非递归处理 RenderNode 树。
2. **Execute**：按 `renderPipeId` 将指令派发给对应的 `RenderPipe`，执行实际绘制。

这一设计将场景结构变化与渲染数据更新分离：`structureDirty` 用于重建指令集，`renderDirty` 用于局部数据更新。WebGL 后端支持多纹理批处理；无法使用 WebGL 时会降级到 Canvas 2D 后端。

### EXML 与 EUI

`@kurot/cli` 在构建期将 `.exml` 文件解析为 SkinIR 并生成 ESM 模块。运行时由 `@kurot/ui` 的主题系统动态加载生成的皮肤工厂，因此产物中不需要携带或解析 EXML 源文件。

自定义 EXML 命名空间通过 `blakron.config.ts` 的 `exml.namespaces` 显式映射到模块入口，取代 Egret 的运行时全局命名空间反射。

## 示例

- [`examples/demo`](examples/demo/)：使用 Vite 的示例项目，展示手写的 EXML 编译集成方式。
- [`examples/my-game`](examples/my-game/)：由 CLI 模板生成的标准游戏项目示例。

## 仓库布局

```text
Kurot/
├── packages/       独立发布的引擎包与 CLI
├── examples/       演示与生成项目示例
├── reference/      本地只读参考源码
├── docs/           本地架构、迁移与调研资料
├── .gitignore      共享的版本控制忽略规则
└── README.md
```

`reference/`、`docs/`、构建输出和本地编辑器配置均由根目录 `.gitignore` 排除，不会进入当前 Git 仓库。若从其他来源取得仓库，请以实际检出内容为准。

## 开发资料

以下资料位于本地 `docs/` 目录；它们在当前 Git 规则中被视为本地资料，可能不会随仓库分发：

- [代码规则](docs/code-rules.md)：语言、运行时、类型和代码风格要求。
- [迁移状态](docs/migration-status.md)：Egret 功能迁移的状态记录。
- [包合并说明](docs/merge-guide.md)：EXML、资源等模块合并进现有包的历史。
- [EXML 集成计划](docs/exml-integration-plan.md)：主题、热更新与 EXML 工作流的计划。
- [WebGPU 迁移草案](docs/webgpu-migration.md)：未来渲染后端的设计草案，尚未表示已实现。
- [Three.js 集成调研](docs/threejs-integration.md)：2D/3D 混合渲染方案的研究资料。
- [Egret `$` setter 审计](docs/egret-dollar-set-audit.md)：迁移细节审计记录。

## 贡献约定

提交前请阅读 [代码规则](docs/code-rules.md)。项目要求 TypeScript、严格类型检查、ESM 与 ES2022；应用层使用 `undefined` 表示缺失值，导出函数必须声明返回类型，并统一使用命名导出。

请在改动所属包内执行相应的构建与测试命令。不要假定根目录存在统一的安装、构建或测试命令。
