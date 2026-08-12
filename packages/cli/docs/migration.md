# 从 Egret 迁移到 Kurot

> 适用版本：`@kurot/cli` 0.7.0

本指南面向 Egret Web 项目。Kurot 保留了常见舞台配置、资源配置和 EXML 习惯，但运行时 API、模块系统及部分 EXML 能力仍需逐项验证。

## 一、命令对照

| Egret | Kurot | 说明 |
| --- | --- | --- |
| `egret create <name>` | `kurot create <name>` | 创建项目 |
| `egret build` | `kurot build` | 开发构建 |
| `egret startserver` / `egret run` | `kurot dev` | 构建并启动开发服务器 |
| `egret clean` | `kurot clean` | 清理输出目录 |
| `egret publish` | `kurot build --release` | 生成压缩、带 hash 的发布产物 |
| `egret upgrade` | 更新 `package.json` 后运行 `pnpm install` | 通过 npm 包管理版本 |

Kurot release 不是单文件：应用、引擎、主题和自定义 namespace 会分别生成 ESM chunk，并由 import map 连接。

常用附加选项：

| 选项 | 命令 | 说明 |
| --- | --- | --- |
| `--watch` | `kurot build` | 监听源码并使用开发模式重编译 |
| `--analyze` | `kurot build` | 分析 release 应用 bundle |
| `--sourcemap` | `build` / `dev` | 生成 sourcemap |
| `-p, --port` | `kurot dev` | 指定端口，默认 `3000` |
| `--template` | `kurot create` | `game` 或 `empty` |

## 二、推荐迁移流程

1. 使用 `npx @kurot/cli create new-project` 创建一个 `game` 模板项目。
2. 安装依赖并运行模板，先确认本机环境正常。
3. 分批迁移源码和资源，不要直接覆盖模板配置。
4. 将全局 `egret.*`、`eui.*` 和 Tween API 改为 Kurot package imports。
5. 迁移 `default.res.json`、主题文件和 EXML，处理构建警告。
6. 使用 `pnpm dev` 验证输入、触摸、状态、布局、滚动和资源加载。
7. 最后运行 `pnpm build -- --release` 验证 release 产物。

## 三、配置迁移

Egret 的 `egretProperties.json` 和 HTML `data-*` 设置统一迁移到 `kurot.config.ts`：

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
	},
};
```

| Egret | Kurot | 说明 |
| --- | --- | --- |
| `modules` | `package.json` dependencies | 运行时模块改为 npm 包 |
| `target.current: "web"` | `target: "html5"` | 当前仅支持 HTML5 |
| 入口类/脚本配置 | `entry` | 默认 `src/Main.ts` |
| `data-content-width` | `stage.width` | 舞台宽度 |
| `data-content-height` | `stage.height` | 舞台高度 |
| `data-scale-mode` | `stage.scaleMode` | 缩放模式 |
| `data-orientation` | `stage.orientation` | 屏幕方向 |
| `data-frame-rate` | `stage.frameRate` | 帧率 |
| HTML/CSS 背景 | `stage.background` | 页面背景色 |
| — | `output.dir` | development 输出目录 |
| 主题配置 | `exml.themeFile` | 主题 JSON 路径 |
| 自定义 EXML 包 | `exml.namespaces` | prefix 到 barrel file 的映射 |

## 四、模块与入口代码迁移

| Egret 模块 | Kurot 包 | 示例能力 |
| --- | --- | --- |
| `egret` | `@kurot/core` | `Sprite`、`TextField`、事件和显示列表 |
| `eui` | `@kurot/ui` | `Button`、`Panel`、`Skin`、布局和主题 |
| `tween` | `@kurot/game` | `Tween`、`Ease` 等游戏扩展 |

```ts
// Egret
class Main extends egret.Sprite {}

// Kurot
import { Sprite } from '@kurot/core';

class Main extends Sprite {}
```

Kurot 使用标准 ESM，不依赖 Egret 的全局命名空间和自定义模块加载器。入口代码还需要自行调用项目使用的 `createPlayer()` 启动逻辑；CLI 生成的 HTML 不读取 `data-entry-class` 来实例化入口类。

## 五、资源和主题迁移

建议保持以下结构：

```text
resource/
├── default.res.json
├── default.thm.json
└── skins/
    ├── ButtonSkin.exml
    └── ...
```

主题支持两种常见写法：

```jsonc
// Egret 路径形式
{
	"skins": {
		"eui.Button": "resource/skins/ButtonSkin.exml"
	},
	"autoGenerateExmlsList": false,
	"exmls": ["resource/skins/ButtonSkin.exml"]
}
```

```jsonc
// Kurot 类名形式
{
	"skins": {
		"eui.Button": "skins.ButtonSkin"
	}
}
```

当 `autoGenerateExmlsList` 为 `false` 且 `exmls` 非空时，CLI 按列表编译；其他情况下递归扫描 `resource/`。构建后的主题会把可识别的路径值转换为皮肤类名，删除编译期列表字段，并写入 `skinsJs`。启用 EXML 后，产物不会包含原始 `.exml` 文件。

`default.res.json` 可沿用 Egret 常见的 `groups` 和 `resources` 结构，但最终兼容程度由当前 Kurot 资源运行时支持的资源类型决定，应在实际项目中逐项验证。

## 六、EXML 迁移

### 内置 namespace

```xml
<eui:Skin
	xmlns:eui="http://ns.egret.com/eui"
	xmlns:egret="http://ns.egret.com/egret">
</eui:Skin>
```

这些 URL 是 XML namespace 标识符。CLI 根据 `eui`、`egret`、`w` 和 `core` 前缀在内部解析，不会访问 URL，因此无需自行搭建 `ns.egret.com`。

### 自定义 namespace

Egret 项目常见写法：

```xml
<eui:Skin xmlns:eui="http://ns.egret.com/eui" xmlns:game="game.*">
	<game:HealthBar />
</eui:Skin>
```

创建一个导出该 namespace 所有类的 barrel file：

```ts
// src/ui/index.ts
export { HealthBar } from './HealthBar.js';
```

然后配置 prefix：

```ts
export default {
	// ...
	exml: {
		themeFile: 'resource/default.thm.json',
		namespaces: {
			game: 'src/ui/index.ts',
		},
	},
};
```

CLI 会生成 `#ns/game` import-map 项和 `js/ns.game.js` chunk。EXML 标签名必须与 barrel file 的导出名一致。

### 当前支持范围

0.7.0 支持常见组件与以下 EXML 写法：

- 普通属性和属性节点；
- `width="100%"` / `height="100%"`；
- `{expression}` 数据绑定；
- 根 Skin 的 `minWidth`、`minHeight` 等属性；
- `<eui:states>` 和 `states="up,down"` 简写；
- `property.state="value"` 状态属性；
- `includeIn` 和 `excludeFrom`。

EXML 并非保证与 Egret 全量语法完全兼容。当前 XML 解析器不支持 DTD、ENTITY 和 namespaced attributes；组件还必须存在于内置 registry 或已配置的自定义 namespace。未知标签会被警告并从皮肤中丢弃，皮肤解析失败会生成空工厂但构建继续。因此迁移时必须阅读构建警告，不能只以进程退出码判断成功。

## 七、输出差异

Development 默认输出到 `bin-debug/`，源码按目录生成 ESM 文件；引擎、主题和 namespace 位于 `js/`。Release 输出到 `bin-release/web/<timestamp>/`，文件压缩并带 content hash。

Kurot 仍会在 release 生成 `manifest.json`：

- `initial`：引擎与自定义 namespace chunk；
- `game`：主题脚本（如果存在）与应用入口。

资源 JSON 保持固定文件名，主题 JS 和代码 chunk 可以带 hash。

## 八、不支持或需要替换的 Egret 能力

| Egret 能力 | 迁移方式或限制 |
| --- | --- |
| Native / WXGame 等 target | 当前仅支持 HTML5 |
| `egret publish` | 使用 `kurot build --release` |
| Egret 全局命名空间 | 改为 `@kurot/*` ESM imports |
| `data-entry-class` 自举 | 在应用入口中调用 `createPlayer()` |
| typescript-plus 特性 | 改写为标准 TypeScript/esbuild 可处理的代码 |
| 浏览器自动刷新 | 当前 `kurot dev` 需要手动刷新 |
| 未注册 EXML 组件 | 加入 `exml.namespaces` barrel 或改用已支持组件 |

## 九、迁移检查清单

- [ ] `package.json` 已声明需要的 `@kurot/*` 运行时依赖。
- [ ] `kurot.config.ts` 的舞台、入口和主题路径正确。
- [ ] 源码已改用 ESM imports。
- [ ] 自定义 EXML prefix 已配置对应 barrel file。
- [ ] 构建日志没有未处理的 EXML warning。
- [ ] states、`includeIn`、`excludeFrom` 和数据绑定表现正确。
- [ ] TextInput、触摸、Scroller、弹出层等交互已在浏览器验证。
- [ ] development 与 release 模式均能启动并加载资源。
