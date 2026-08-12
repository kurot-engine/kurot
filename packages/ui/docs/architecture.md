# @kurot/ui 架构文档

> 版本：0.1.0 | 更新日期：2026-05-02

---

## 一、概述

`@kurot/ui` 是 Kurot 游戏引擎的 UI 组件框架，从 Egret EUI 迁移而来。
依赖 `@kurot/core` 提供的渲染原语（DisplayObject、Sprite、TextField 等），
在其上实现完整的 UI 组件系统：布局、皮肤、状态、数据绑定。

---

## 二、目录结构

```
packages/ui/
├── src/
│   ├── index.ts                  # 统一导出
│   ├── core/
│   │   ├── IUIComponent.ts       # 布局契约接口
│   │   ├── UIState.ts            # 布局状态引擎（委托模式核心）
│   │   ├── UIComponent.ts        # 重导出 isUIComponent（向后兼容）
│   │   ├── Validator.ts          # 失效/验证调度器（单例）
│   │   ├── Theme.ts              # 皮肤主题
│   │   ├── Direction.ts          # 方向常量
│   │   ├── ScrollPolicy.ts       # 滚动策略常量
│   │   ├── IViewport.ts          # 可滚动容器接口
│   │   ├── IAssetAdapter.ts      # 资源加载适配器接口
│   │   ├── IThemeAdapter.ts      # 主题加载适配器接口
│   │   ├── IDisplayText.ts       # 文本显示接口
│   │   └── IItemRenderer.ts      # 列表项渲染器接口
│   ├── layouts/
│   │   ├── ILayoutTarget.ts      # 布局目标接口
│   │   ├── LayoutBase.ts         # 布局基类（抽象）
│   │   ├── BasicLayout.ts        # 绝对布局
│   │   ├── LinearLayoutBase.ts   # 线性布局基类（待实现）
│   │   ├── VerticalLayout.ts     # 垂直布局（待实现）
│   │   ├── HorizontalLayout.ts   # 水平布局（待实现）
│   │   └── TileLayout.ts         # 瓦片布局（待实现）
│   ├── components/
│   │   ├── Group.ts              # 容器基类（已实现）
│   │   ├── Component.ts          # 可换肤组件基类（已实现）
│   │   ├── Skin.ts               # 皮肤基类（已实现）
│   │   ├── Button.ts             # 按钮（待实现）
│   │   └── ...                   # 其余组件见 plan.md
│   ├── events/
│   │   ├── UIEvent.ts            # UI 生命周期事件
│   │   ├── ItemTapEvent.ts       # 列表项点击
│   │   ├── CollectionEvent.ts    # 数据集合变更
│   │   ├── PropertyEvent.ts      # 属性变更
│   │   └── ScrollerThrowEvent.ts # 滚动惯性（待实现）
│   ├── states/
│   │   ├── IOverride.ts          # 状态覆盖接口
│   │   ├── State.ts              # 视图状态
│   │   ├── AddItems.ts           # 状态中添加子项
│   │   ├── SetProperty.ts        # 状态中设置属性
│   │   └── SetStateProperty.ts   # 状态中设置状态属性
│   ├── binding/
│   │   ├── Watcher.ts            # 属性监听器（待实现）
│   │   └── Binding.ts            # 数据绑定（待实现）
│   └── collections/
│       ├── ICollection.ts        # 数据集合接口（待实现）
│       └── ArrayCollection.ts    # 数组集合（待实现）
└── docs/
    ├── architecture.md           # 本文件
    └── plan.md                   # 开发计划与进度
```

---

## 三、核心机制

### 3.1 失效/验证循环（Invalidation Cycle）

UI 组件的布局更新是延迟批处理的，避免属性多次变更导致重复计算。

```
属性变更
  → invalidateProperties() / invalidateSize() / invalidateDisplayList()
  → Validator 队列入队
  → requestAnimationFrame tick
  → validateProperties()  (浅→深，commitProperties)
  → validateSize()        (深→浅，measure)
  → validateDisplayList() (浅→深，updateDisplayList)
```

`Validator` 是全局单例，所有 UI 组件共享同一个调度器。

### 3.2 UIState 委托模式

旧 EUI 用 `implementUIComponent()` + prototype 拷贝实现多继承（DisplayObject + UIComponent）。
新版改为委托模式：每个 UI 组件持有一个 `UIState` 实例，所有布局逻辑集中在 `UIState` 里。

```ts
// Group 和 Component 的结构
class Group extends Sprite implements IUIComponent {
	readonly ui: UIState; // 持有布局状态

	constructor() {
		super();
		this.ui = new UIState(this); // this 作为 IUIOwner 传入
	}

	// 每个 IUIComponent 方法直接委托
	get left() {
		return this.ui.left;
	}
	set left(v) {
		this.ui.left = v;
	}
	invalidateSize() {
		this.ui.invalidateSize();
	}
	// ...
}
```

`UIState` 通过 `IUIOwner` 接口与宿主 `DisplayObject` 通信，需要访问 `x/y/stage/parent/matrix` 等属性时通过 owner 拿。

优点：

- 无 prototype 操作，无 `as never` 强制转型
- `UIState` 是普通类，完全类型安全
- `Group` 和 `Component` 的继承链干净（只继承 `Sprite`）

### 3.3 布局系统

```
Group
  └── layout: LayoutBase
        ├── BasicLayout      — 约束定位（left/right/top/bottom/center/percent）
        ├── VerticalLayout   — 垂直线性排列
        ├── HorizontalLayout — 水平线性排列
        └── TileLayout       — 网格排列
```

布局由 `Group.measure()` 和 `Group.updateDisplayList()` 委托给 `layout` 对象执行。

### 3.4 皮肤系统（待实现）

```
Component（可换肤组件）
  └── skinName: string | Class
        → Theme.getSkinName()  → 查找默认皮肤
        → 实例化 Skin 对象
        → Skin.hostComponent = this
        → 皮肤中的 partAdded() 回调通知组件
```

皮肤（Skin）是一个普通的 Group 子类，由 EXML 编译器生成或手写。
皮肤通过 `id` 属性暴露"皮肤部件"（skin parts），组件通过 `partAdded()` / `partRemoved()` 响应。

### 3.5 视图状态（待实现）

组件通过 `currentState` 属性切换状态（如 `"up"` / `"down"` / `"disabled"`）。
状态变更时，`State` 对象中的 `IOverride` 列表（AddItems / SetProperty）被依次应用或撤销。

---

## 四、与 @kurot/core 的依赖关系

| @kurot/ui 使用       | @kurot/core 提供                             |
| ---------------------- | ---------------------------------------------- |
| `UIComponentImpl` 基类 | `DisplayObject`                                |
| `Group` 基类           | `Sprite` (DisplayObjectContainer)              |
| 布局边界计算           | `Rectangle`, `Matrix`                          |
| 事件系统               | `EventDispatcher`, `Event`, `IEventDispatcher` |
| 图片组件               | `Bitmap`, `Texture`                            |
| 文本组件               | `TextField`                                    |
| 计时器                 | `Timer`                                        |

---

## 五、API 兼容性说明

### Breaking Changes（相对旧 EUI）

| 变更                                | 影响              | 迁移方式                             |
| ----------------------------------- | ----------------- | ------------------------------------ |
| `eui.*` namespace 移除              | 所有引用          | 改用 ES Module 具名导入              |
| `thisObject` 参数移除               | 事件监听          | 使用箭头函数                         |
| `implementUIComponent()` 移除       | 自定义组件        | 直接继承 `Component` 或 `Group`      |
| EXML 运行时解析移除                 | `eui.EXML.load()` | 编译期由 cli 处理，运行时直接 import |
| `egret.registerImplementation` 移除 | 适配器注册        | 直接传入适配器实例                   |

### 保持兼容的 API

- 所有约束属性：`left` / `right` / `top` / `bottom` / `horizontalCenter` / `verticalCenter`
- 百分比尺寸：`percentWidth` / `percentHeight`
- 布局方法：`setLayoutBoundsSize()` / `setLayoutBoundsPosition()` / `getLayoutBounds()` / `getPreferredBounds()`
- 失效方法：`invalidateProperties()` / `invalidateSize()` / `invalidateDisplayList()`
- 皮肤部件机制：`skinName` / `partAdded()` / `partRemoved()`（待实现）
- 视图状态：`currentState` / `states`（待实现）
