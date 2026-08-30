# @kurot/ui 架构文档

> 当前版本：1.1.9，peerDependency `@kurot/core: ^1.0.12`。逐条变更记录见
> [CHANGELOG.md](../CHANGELOG.md)。
> 面向 AI 智能体的速查文档见 [ai-context.md](./ai-context.md)（目录地图、反
> 直觉行为清单、术语表、任务→文件速查表）。本文档面向人类读者，讲设计动机
> 与内部机制，两份文档不重复内容，互相引用。

---

## 一、概述

`@kurot/ui` 是从零重写的 EUI 兼容 UI 框架，建在 [`@kurot/core`](../../core/docs/architecture.md)
之上。对 core 是 `peerDependency`，不打包进产物——依赖方项目需要显式安装
`@kurot/core`，这样多个使用 UI 库的包才能共享同一份 core 实例，避免出现
两套独立的显示树/全局状态。

整个包最核心的架构决策是**委托模式取代原型混入**：Egret EUI 用
`implementUIComponent()` 做 prototype 拷贝来模拟"一个类同时是 DisplayObject
又是 UIComponent"的多继承效果，这种做法在 TypeScript 严格模式下没法表达
（拷贝出来的属性没有类型），也违反团队约定的"继承链不超过 2 层"规则。
`@kurot/ui` 换成了纯组合：`Group`/`Component` 都只 `extends Sprite`（继承链
1 层），把全部布局状态和验证逻辑单独放进 `UIState` 类，`Group`/`Component`
各持有一个 `UIState` 实例（`this.ui`），把 `IUIComponent` 接口的每个方法都
写成一行委托。`UIState` 反过来只通过一个很窄的 `IUIOwner` 回调接口跟宿主
通信，完全不知道宿主具体是 `Sprite` 还是别的什么——这个解耦是"皮肤系统"
和"验证系统"能够分别独立演化、不互相牵连的前提。

---

## 二、验证循环（失效/校验机制）

### 2.1 三阶段 + 三个独立队列

UI 组件的布局更新是延迟批处理的：属性修改不会立刻触发重排，而是把组件
"排队"，等到下一个 `requestAnimationFrame` 才统一处理，避免同一帧内多次
修改属性导致重复计算。

`Validator`（单例 `validator`）内部维护三个独立的 `DepthQueue`：
`_propsQueue`、`_sizeQueue`、`_displayQueue`。每个队列按 `$nestLevel`
（core 的 `DisplayObject` 字段，不是 UI 概念）分桶，`Map<number, DepthBin>`，
每个 `DepthBin` 内部是数组 + `Set` 的组合——`Set` 提供 O(1) 的"是否已在
队列里"去重检查，数组提供有序的弹出。

三阶段按固定顺序执行，但**遍历方向不同**：

```
validateProperties()  浅→深   commitProperties()
validateSize()         深→浅   measure()
validateDisplayList()  浅→深   updateDisplayList()
```

方向不是随意选的，反映的是数据依赖方向：

- **属性提交浅→深**：父组件的属性变化经常需要先"下推"给子组件（比如
  `List` 先把 `data` 设到某个 renderer 上，这个 renderer 才能据此测量自己
  的文本尺寸）。父先处理，它在提交属性过程中新增/移除的子节点才能在同一轮
  里被正确地轮到。
- **测量深→浅**：容器的测量尺寸通常是子节点尺寸的函数（`VerticalLayout`
  求和、`BasicLayout` 求 union），必须先测完所有子节点才能正确测量父节点。
- **显示列表提交浅→深**：容器决定每个子节点该放在哪（调用
  `child.setLayoutBoundsSize`/`setLayoutBoundsPosition`），子节点需要先拿到
  这个位置信息才能定稿自己的显示状态,所以还是父先处理。

`DepthQueue.shift()`（浅→深）用一个只会前进不会回退的 `_min` 游标；
`pop()`（深→浅）对称地用 `_max` 游标——这让连续多次 `shift()`/`pop()`
调用摊销下来是 O(1)，不需要每次都从头扫描所有深度桶。

### 2.2 三阶段之间的"打断重来"问题

三阶段分离本身有一个经典难题：`validateProperties()` 在处理对象 A 时，
可能会调用某个已经跑过属性验证的对象 B 的 `invalidateSize()`，或者给某个
兄弟节点新增属性失效。如果三个阶段各自傻乎乎地跑一遍就完事，这类"迟到"
的失效请求会被漏掉，逻辑上它们其实属于*同一轮*校验，应该被处理。

`validateClient(target)` 是这个问题的正确解法，用于强制同步校验（比如把
一个之前移除的组件重新加回舞台，或者显式调用 `component.validateNow()`）：

1. 把 `_targetLevel` 设成 `target.$nestLevel`（如果已经在另一个
   `validateClient` 调用内部，则不覆盖——`_targetLevel === Infinity` 的
   检查保证了重入安全）。
2. 跑一个 `while (!done)` 外层循环：
    - 先浅→深清空 `_propsQueue` 里深度不超过 target 的部分，逐个跑
      `validateProperties()`（跑之前检查 `obj.stage` 还在，跳过中途被移出
      舞台的对象）。
    - 再深→浅清空 `_sizeQueue`。**关键点**：如果在测量过程中，`target` 子树
      内某个对象又触发了属性失效（`_clientPropsFlag` 被置位），就把一个
      元素塞回 `_propsQueue`，标记 `done = false` 并 `break`——强制外层循环
      从第一阶段重新开始。这就是"迟到的属性失效"能在显示列表阶段跑之前
      被重新处理的机制。
    - 显示列表阶段同理，同时监视 `_clientPropsFlag` 和 `_clientSizeFlag`。
3. `finally` 块无条件恢复 `_targetLevel` 并重新同步各阶段的标志位——这是
   为了保证哪怕某个 client 的 `validateProperties()` 抛出异常，`Validator`
   内部记账状态在下一次校验时仍然一致（`Validator.test.ts` 专门测试了
   这个异常路径）。
4. `_clientPropsFlag`/`_clientSizeFlag` 只有在 `_targetLevel` 不是
   `Infinity`（即当前正处在某次 `validateClient` 调用内）且失效对象的深度
   落在 target 子树内时才会被置位——普通的 RAF 调度路径完全不会触发这个
   检查，不产生额外开销。

普通的 RAF 调度路径（`_schedule()` → `_flush()`）简单得多：没有打断重来的
逻辑，也不追踪重入。三个阶段依次跑一遍，各自用普通的 `shift()`/`pop()`
清空整棵树的队列（不像 `validateClient` 只处理某个子树）。跑完之后如果
任何一个标志位仍是 true（说明校验过程中又产生了新的失效），就再排一次
`requestAnimationFrame`，不会在同一个调用栈里同步循环——这意味着普通路径
下，一次级联的失效可能跨越好几帧才收敛，而 `validateClient` 保证一次调用
内同步收敛。这是两条路径在"一致性 vs 延迟"上刻意做出的不同取舍。

### 2.3 非浏览器环境降级

`_schedule()` 每次调用都检查一次 `typeof requestAnimationFrame`，如果不
存在（Node/无 DOM 的测试环境），退化成 `setTimeout(0)`——代价是不再跟
屏幕刷新率同步。`Validator.test.ts` 用 `vi.useFakeTimers()` +
`validateClient()` 来避开对任一调度原语的依赖。

---

## 三、皮肤系统

### 3.1 Skin 不是显示对象——这是相对 Egret EUI 最大的结构性差异

`Skin`（`components/Skin.ts:25`）是 `class Skin extends EventDispatcher<SkinEvents>`
——一个普通数据持有者,不在显示树里出现。这跟 Egret EUI 里 Skin 本身就是
一个真实的 `DisplayObjectContainer` 子类完全不同。`Skin` 唯一的职责是
声明 `skinParts`（字符串数组）、`states`（State 列表）、`elementsContent`
（要挂载的显示对象数组），实际挂载动作由宿主 `Component` 的
`_setSkin()` 完成——`elementsContent` 里的每个显示对象被直接
`addChildAt` 到*宿主组件*上，不是挂到 `Skin` 对象上。

这个设计选择的动机是让 `Skin` 保持纯粹的"声明式配置对象"角色，跟视觉
渲染完全脱钩,`Component` 才是唯一的显示树节点。

### 3.2 主题加载的完整链路

```
Theme(url) 构造
  → setTheme(this)                  立即同步把自己注册为全局主题（还没加载完）
  → _load(url)                      用 adapter.getTheme(url, onSuccess, onError)
      → _onConfigLoaded(raw)        解析 JSON，把 skins/styles 合并进内部表
          → 若有 skinsJs 字段
              → _loadSkinsModule()  动态 import 编译产物
          → _onLoaded()             _initialized = true，处理 _delayList，派发 Event.COMPLETE
      → 失败路径 → _onLoadFailed()  同样 _initialized = true + 处理 _delayList，
                                     但派发 IOErrorEvent.IO_ERROR
```

一个容易踩的坑：`Theme.ts` 里实际生效的默认适配器，是文件底部一个内联的
`_defaultThemeAdapter` 对象（用 `XMLHttpRequest`），**不是**公开导出的
`DefaultThemeAdapter` 类（`core/DefaultThemeAdapter.ts`，用 `fetch()`）。
`_load()` 只在构造 `Theme` 时显式传入自定义 adapter 才会绕开内联的那个。
`DefaultThemeAdapter` 目前是导出了但没有任何内部代码路径会用到它，只有
调用方自己 `new DefaultThemeAdapter()` 传进去才会被激活——这是一处可以
清理的重复实现，两个 adapter 分别用 XHR 和 fetch，逻辑没有共享，将来
修 bug 容易只改一边漏另一边。

### 3.3 编译期产物如何在运行时被找到——globalThis 是事实上的皮肤注册表

`@kurot/cli` 编译 EXML 时，为每个主题生成一个索引模块，做的事情等价于：

```js
import { createButtonSkin as s0 } from './skin0.js';
globalThis['skins.ButtonSkin'] = s0;
```

`Theme._loadSkinsModule()` 相对主题配置文件自身的 URL 解析出
`skinsJs` 路径，动态 `import()` 这个模块。因为 ESM 模块求值是自顶向下
同步执行的，`import()` 的 Promise resolve 的那一刻，这个 bundle 里的每个
皮肤 factory 已经把自己挂到 `globalThis` 上了。

真正的读取发生在后面，`Component._parseSkinName()` 处理字符串形式的
`skinName` 时做 `(globalThis as Record<string, unknown>)[skinName]`。
所以完整链路是：

```
CLI 编译期            globalThis["skins.X"] = factory   （import 副作用）
Theme 配置文件          hostComponentKey → "skins.X"      （字符串映射）
Component 赋皮肤时      globalThis["skins.X"]              （读取拿到 factory）
```

没有独立的注册表对象——`globalThis` 本身就是皮肤 factory 的注册表。这是
刻意换来简单性的设计，代价是**皮肤类名是一个事实上的全局命名空间**：两个
主题如果凑巧用了同名的皮肤类（比如都叫 `"skins.ButtonSkin"`），后加载的
会直接覆盖前一个在 `globalThis` 上的槏位。

### 3.4 组件创建早于主题加载完成——`_delayList` 机制

游戏代码经常需要在网络请求（拉取主题配置）完成之前就先把 UI 树搭好。
`Component.createChildren()` 如果没有显式设置 `skinName`，会去问全局
`Theme` 要一个默认皮肤名：

- 如果主题还没初始化完（`!theme._initialized`），`Theme.getSkinName()`
  把这个组件塞进 `_delayList`（去重），当下返回空字符串——**组件先以
  完全没有皮肤的状态创建出来**。
- 主题加载完成（成功或失败都算）后，`_handleDelayList()` 遍历这个队列：
  对每个还没被用户手动设置过 `skinName` 的组件，重新解析出真正的皮肤名，
  调用 `component._applySkinName()` 补上皮肤，触发一次重新验证。

净效果：早创建的组件会有一到几帧渲染成"裸组件"，主题加载完（含 skinsJs
模块的动态 import）之后被追加皮肤——这是让引擎能够异步解耦主题加载和
UI 树构建的机制，跟 Egret 的异步主题加载惯例是一致的。

### 3.5 `_setSkin` 的拆装流程

`_parseSkinName()` 根据 `skinName` 的类型分派：函数 → 直接当 factory 调；
字符串 → 先查 `globalThis` 再当 factory 调；对象 → 直接当 `Skin` 实例用。

`_invokeSkinFactory()` 用正则 `/^class\s/.test(Function.prototype.toString.call(fn))`
区分真正的 ES class 构造器（用 `new` 调）和 EXML 编译产生的 factory 函数
（用 `fn.call(this)` 调，让 factory 内部的 `this` 指向宿主组件——这对
EXML 生成的 `Binding.bindProperty(this, ...)` 调用是必须的，因为绑定要
闭包住宿主对象）。手写的 class 皮肤如果用了 EXML 风格的 `{binding}`
语法就会拿到错误的 `this`——源码里有明确注释警告这一点。

`_setSkin(skin)` 做的事：

1. **拆旧**：`oldSkin.hostComponent = undefined`（触发退出旧状态，这时
   显示树还完整）→ `oldSkin.unwatchAll()`（清空所有 EXML 生成的
   `Watcher`）→ 逐个清空皮肤部件绑定 → 把 `elementsContent` 从宿主上摘掉。
2. **装新**：遍历 `skin.skinParts`，逐个 `skin.getPart(name)` 取值，非空
   就绑定（触发 `partAdded()` 回调）→ 按声明顺序把 `elementsContent`
   `addChildAt` 到宿主 → 最后 `skin.hostComponent = this`（这一步才触发
   `Skin` 自己的状态机初始化）。
3. 收尾 `invalidateSize()` + `invalidateDisplayList()` + 在*组件*（不是
   皮肤）上派发 `Event.COMPLETE`。

---

## 四、视图状态（State/Override 系统）

### 4.1 状态切换的实际算法——没有真正的"diff"

`IOverride` 只有两个方法：`apply(host, skin)`、`remove(host, skin)`。
`Skin._applyState(fromState, toState)` 的实现是：

```
oldState = states.find(s => s.name === fromState)
若存在：对 oldState.overrides 逐个调用 override.remove(host, this)

newState = states.find(s => s.name === toState)
若存在：对 newState.overrides 逐个调用 override.apply(host, this)
```

**这就是全部逻辑**——无条件撤销旧状态的每个 override，无条件应用新状态
的每个 override，**没有对比新旧两个状态的 override 列表、找出实际变化
的部分**。如果同一个 `IOverride` 实例（或者逻辑等价的两个实例）同时出现
在新旧两个状态里，它会被撤销然后立刻重新应用——对 `SetProperty`/
`SetStateProperty` 而言这只是白做一次无意义的往返（先恢复旧值再设成
同一个新值），但对 `AddItems` 而言会造成一次多余的
"从容器移除→重新添加"，可能带来 z-order 重置（如果没有重新指定完全
一致的 `position`）。这是一个真实的性能/正确性细节，跟熟悉 Flex 那种
"只应用差集"的智能 diff 的开发者的直觉不符。

### 4.2 三种 override 的具体行为

- **`SetProperty`**：目标是某个皮肤部件（或皮肤对象本身，`target` 为空时）
  ，`apply()` 时先缓存旧值到 `_oldValue`，再赋新值；`remove()` 恢复
  `_oldValue`，但只在 `_applied` 为真时才恢复（防御性检查，避免没有
  `apply()` 过就调 `remove()`）。
- **`SetStateProperty`**：同样的模式,但目标是**宿主组件本身**
  （`host[name] = value`），不是皮肤部件——用于状态驱动的、影响组件自己
  公开 API 的变化（比如 `enabled`），不是内部视觉细节。
- **`AddItems`**：`apply()` 时把某个显示对象移到目标容器里（默认是宿主）
  的指定位置；`remove()` 时把它移出，但只在
  `item.parent === dest` 时才动手——防御性检查，避免这个对象在中途被
  别的逻辑挪去了别处。

### 4.3 `Skin` 与 `Group` 各自维护一套几乎相同的状态机——已知的重复

`Group` 没有附着的 `Skin`（容器本身不换肤），所以它自己复刻了一份跟
`Skin._applyState` 结构上完全相同的 apply/remove 逻辑（`Group.ts` 的
`_commitCurrentState()`），直接持有 `_states`/`_statesMap`/`_currentState`
字段。调用 override 时传的是 `override.apply(this as unknown as Component,
this as unknown as Skin)`——因为 `IOverride.apply/remove(host, skin)`
这个签名假设的是一对独立的 `Component` + `Skin`，但 `Group` 只有自己
一个对象，只能同时假扮两个角色（这能工作是因为 `Group` 状态实际用到的
override 通常是 `SetStateProperty`，从不真正调用 `skin.getPart()`）。

这是一处已知的架构重复——两套结构相同的状态机分别长在 `Skin` 和 `Group`
上，如果抽出一个共享的 `applyStateTransition(states, from, to, host, skin)`
辅助函数，能去掉大约 30 行重复代码和那处不安全的双重类型转换。目前
未做这个抽取，属于已知但尚未处理的技术债，不是刻意的设计。

---

## 五、布局系统

### 5.1 measure/updateDisplayList 契约

`LayoutBase`（抽象基类）声明两个抽象方法，每个具体布局都要实现：

- **`measure()`**——深→浅阶段调用。任务是根据每个子节点的
  `getPreferredBounds()`，算出容器自己的期望尺寸，调用
  `target.setMeasuredSize(w, h)` 恰好一次。
- **`updateDisplayList(width, height)`**——浅→深阶段调用，传入的是*实际*
  分配到的宽高（可能跟测量尺寸不同，如果父节点做了约束）。任务是给每个
  纳入布局的子节点调用 `setLayoutBoundsSize()` + `setLayoutBoundsPosition()`
  ，最后调用一次 `target.setContentSize(w, h)` 报告实际占用尺寸（用于
  滚动/视口计算，跟测量尺寸是两个不同的概念）。

`ILayoutTarget` 是布局算法需要从容器那里拿到的最小接口
（`numChildren`/`getChildAt`/`scrollH`/`setMeasuredSize`/... ）。`Group`
和 `Component` 都实现了这个接口，所以同一批布局类（`BasicLayout`、
`VerticalLayout` 等）既能当 `Group.layout` 用，也能被 `Component` 内部
用作默认布局（`Component` 的度量/显示列表更新其实是委托给一个共享的
`BasicLayout` 单例实例，通过临时设置 `.target` 复用）。

`includeInLayout` 过滤：每个布局遍历子节点时会跳过没有实现
`getPreferredBounds()`（鸭子类型检查）或者 `includeInLayout === false`
的对象——这就是 EUI 风格的 `includeIn`/`excludeFrom` 状态覆盖能"从布局里
隐藏一个元素但不把它移出显示树"的底层机制。

### 5.2 百分比尺寸

`BasicLayout`（约束布局）解析 `left`/`right`/`top`/`bottom`/
`horizontalCenter`/`verticalCenter` 加 `percentWidth`/`percentHeight`。
只有当对应方向的两个位置约束**没有同时设置**（`left` + `right` 同时给出
意味着宽度已经被算死了，`unscaledWidth - right - left`，这时优先于
`percentWidth`）百分比才会生效。字符串形式的约束值（EXML 里写
`left="10%"`）由 `fmt()` 辅助函数统一解析：以 `%` 结尾的当百分比处理，
否则强转数字——没有单独的"百分比 vs 像素"类型标签。

`LinearLayoutBase.flexChildrenProportionally()`（`VerticalLayout`/
`HorizontalLayout` 共用）实现的是带 min/max 夹紧的迭代式百分比分配：用
`do...while(!done)` 循环反复找出"按比例分配会超出自己 min/max 限制"的
子节点，把它夹到边界值，从剩余待分配池里移除（原地分区交换，不做数组
拼接），把它的 `percent` 从总百分比里减掉，再对剩下的子节点重新分配——
这不是一次除法就能算完的，因为一个子节点被夹住之后,其他子节点的"有效
百分比份额"要跟着变。这是 Flex 盒模型百分比分配算法的移植。

### 5.3 间距与内边距

`LinearLayoutBase` 持有 `_gap`/`_paddingLeft/Right/Top/Bottom`（setter
统一调用 `_invalidateTargetLayout()`）。`VerticalLayout`/`HorizontalLayout`
在分配空间之前先减掉 `(numElements - 1) * gap`，第二遍定位时每两个元素
之间加上 `gap`。`TileLayout` 单独维护 `_horizontalGap`/`_verticalGap`
和自己的 padding 字段——它直接 `extends LayoutBase`，不经过
`LinearLayoutBase`，所以 padding 的 getter/setter 是重复实现的一份，不是
共享的。

### 5.4 虚拟布局

虚拟布局（`layout.useVirtualLayout = true`，默认关闭，这是相对 Egret
EUI 的一处差异）存在的意义是让 `List`/`DataGroup` 面对成千上万条数据时
只实例化当前可见范围内的 renderer：

- **`elementSizeTable: number[]`**（`LinearLayoutBase` 的受保护字段）
  按数据下标（不是显示子节点下标，因为屏幕外的元素根本没被实例化）缓存
  每个元素沿布局轴的最近一次已知尺寸。`NaN` 表示"还不知道，用
  `typicalWidth`/`typicalHeight` 估算"（默认 71×22）。
- **`elementAdded(index)`/`elementRemoved(index)`** 让尺寸表跟随
  `ICollection` 的增删同步,不需要整体重新测量。
- **`getStartPosition(index)`**：累加 `elementSizeTable` 得到某下标的
  起始偏移；配合 `findIndexAt`（递归二分查找）可以反过来从滚动位置推算出
  当前可见的下标范围。
- `updateDisplayListVirtual()` 只遍历 `startIndex..endIndex`，先调用
  `target.setVirtualElementIndicesInView(startIndex, endIndex)`——这是
  `DataGroup` 用来回收/实例化对应下标范围的 renderer 的钩子。
- `measureVirtual()` 靠 `getElementTotalSize()`（缓存尺寸求和，未知条目
  用估算尺寸补）加上一次只针对当前可见范围的修正测量，来估算总可滚动
  尺寸——不需要为了拿到一个近似总长度就把所有屏幕外条目都实例化一遍。
- `TileLayout` 的虚拟模式不用 `elementSizeTable`，而是直接用
  `scrollH`/`scrollV` 除以固定的 `列宽+间距`/`行高+间距` 算出可见下标
  范围（`_getIndexInView()`）——因为瓦片布局的格子本身就是等宽等高的，
  比线性布局的可变尺寸虚拟化简单得多。

**给未来扩展布局系统的人的提示**：`LayoutBase.getElementIndicesInView()`
这个公开方法默认返回空数组，而 `VerticalLayout`/`HorizontalLayout`/
`TileLayout` 各自实现的其实是名字不同的**受保护**方法
（`getIndexInView()`/`_getIndexInView()`），**没有一个真正重写了基类的
这个公开方法**。也就是说 `LayoutBase.getElementIndicesInView()` 目前是一处
没有被实际接上任何逻辑的、看起来像扩展点但并不是的公开 API——新写一个
布局类不要假设覆写它就能拿到虚拟可见范围。

---

## 六、组件类层级（完整组件目录）

### 继承 `Component`（可换肤，单一视觉宿主，`skin`/`currentState` 委托给 `Skin`）

| 类                                    | 一句话说明                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `Component`                           | 所有可换肤组件的抽象基类——皮肤生命周期、视图状态委托、约束布局属性、校验委托给 `UIState`。 |
| `Rect`                                | 矩形图形基元，带填充/描边。                                                                |
| `Image`                               | 展示通过 `IAssetAdapter` 解析出的位图数据。                                                |
| `Label`                               | 文本展示，包装一个 `TextField`。                                                           |
| `EditableText`（继承 `Label`）        | 支持占位提示的可编辑文本框。                                                               |
| `Button`                              | 带 up/down/disabled 状态的可点击按钮；`toggle` 标志让子类实现自动切换 `selected`。         |
| `ToggleButton`（继承 `Button`）       | 默认 `toggle = true`，每次点击自动翻转选中状态。                                           |
| `CheckBox`（继承 `ToggleButton`）     | 功能与 `ToggleButton` 相同，视觉区别完全由皮肤决定。                                       |
| `RadioButton`（继承 `ToggleButton`）  | 通过独立的 `RadioButtonGroup` 实现互斥选择。                                               |
| `ToggleSwitch`（继承 `ToggleButton`） | 皮肤变体，渲染成滑动开关样式。                                                             |
| `Range`                               | 数值限制在 `[minimum, maximum]`，可选 `snapInterval`，是滑块的基类。                       |
| `SliderBase`（继承 `Range`）          | 拖动 thumb/track 皮肤部件来改变数值的抽象滑块行为。                                        |
| `HSlider`（继承 `SliderBase`）        | 水平方向，从左到右。                                                                       |
| `VSlider`（继承 `SliderBase`）        | 垂直方向，从下到上。                                                                       |
| `ScrollBarBase`                       | 滚动条基类——拖动 thumb 跟视口滚动位置绑定。                                                |
| `HScrollBar`（继承 `ScrollBarBase`）  | 水平滚动（`scrollH`）。                                                                    |
| `VScrollBar`（继承 `ScrollBarBase`）  | 垂直滚动（`scrollV`）。                                                                    |
| `ProgressBar`                         | 通过裁剪的 thumb（`scrollRect`）展示任务进度，支持标签格式化。                             |
| `TextInput`                           | 文本输入框，支持占位提示和密码遮罩。                                                       |
| `Panel`                               | 带可选标题栏/关闭按钮/拖拽区域的可换肤容器。                                               |
| `Scroller`                            | 包装一个 `IViewport`（通常是 `Group`），提供触摸滚动和滚动条管理。                         |
| `ComboBox`                            | 下拉选择组件——触发按钮 + 悬浮下拉列表。                                                    |
| `ItemRenderer`                        | `DataGroup`/`List`/`TabBar` 使用的数据驱动列表项渲染器基类。                               |

### 继承 `Group`（纯容器，不换肤，自带一套轻量状态机，持有可插拔的 `LayoutBase`）

| 类                             | 一句话说明                                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `Group`                        | 容器基类：参与校验循环，把子节点定位委托给 `LayoutBase`，自带一套状态机（跟 `Skin` 的状态机结构重复,见 4.3 节）。 |
| `DataGroup`（继承 `Group`）    | 把 `ICollection` 数据源转换成 item renderer 实例，维护一个可复用的 renderer 空闲池支持虚拟布局回收。              |
| `ListBase`（继承 `DataGroup`） | 增加 `selectedIndex`/`selectedItem` 选中状态和 `requireSelection` 语义。                                          |
| `List`（继承 `ListBase`）      | 增加点击 renderer 选中的触摸交互。                                                                                |
| `TabBar`（继承 `ListBase`）    | 一排可选中标签，默认 `requireSelection = true`。                                                                  |
| `ViewStack`                    | 堆叠子节点的导航容器，任意时刻只显示一个；实现 `ICollection`。                                                    |
| `UILayer`                      | 顶层容器，监听 `RESIZE` 自动跟随舞台尺寸。                                                                        |

### 不属于 `Component`/`Group` 层级的支持类

| 类                 | 一句话说明                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `Skin`             | 数据持有者（继承 `EventDispatcher`）——声明 `skinParts`/`states`/`elementsContent`,自己不在显示树里（见第三节）。 |
| `RadioButtonGroup` | 继承 `EventDispatcher`——追踪同一 `groupName` 下多个 `RadioButton` 的互斥关系，派发 `PropertyEvent`。             |
| `TouchScroll`      | 触摸滚动的惯性物理模拟，被 `Scroller` 使用。                                                                     |
| `Animation`        | 简单数值缓动工具,被 `TouchScroll` 使用，靠 core 的 `ticker` 驱动。                                               |

---

## 七、与 Egret EUI 的对应关系

| Egret EUI 概念                                                 | Kurot UI 对应                                                                    | 说明                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `eui.Component`                                                | `Component`                                                                      | 角色相同，Kurot 用真正的类继承（`extends Sprite`）取代 Egret 的命名空间混入风格。                                                                                                                                                                                            |
| `eui.Skin`                                                     | `Skin`                                                                           | Egret 的 Skin 通常是 EXML 生成的真实 `DisplayObjectContainer` 子类；Kurot 的 `Skin` 明确**不是**显示对象——这是相对 Egret 最大的结构性偏离（见第三节）。                                                                                                                      |
| `eui.UIComponent` 的三阶段校验                                 | `UIState` + `Validator`                                                          | 同样的三阶段 RAF 批处理模型（提交属性 → 测量 → 提交显示列表），同样按深度排队——`Validator.ts` 基本是 Egret `UIComponent` 校验内部机制的结构化移植。                                                                                                                          |
| `eui.IThemeAdapter` / 框架内置的主题单例                       | `IThemeAdapter` + `Theme`/`getTheme()`/`setTheme()`                              | Egret 的主题加载策略基本是框架内置的；Kurot 把网络请求策略做成了可通过构造函数注入的接口（见下方"全新设计"）。                                                                                                                                                               |
| 编译期 EXML 皮肤类的全局命名空间注册                           | `globalThis["skins.X"] = factory` 自注册 ESM 导入                                | 概念上是同一种"全局皮肤注册表"模式，但 Kurot 的编译产物生成的是 **factory 函数**而不是类，专门为了支持用 `.call(this)` 调用来绑定 `this` 上下文——这是类继承重写带来的新问题（原本 Egret 的命名空间混入模式不存在这个绑定问题），Kurot 特有的解法,在 Egret 里没有直接对应物。 |
| `State`/`SetProperty`/`SetStateProperty`/`AddItems` 覆盖机制   | 同名类，同一个 `IOverride` 接口                                                  | 对 Egret/Flex 视图状态覆盖模式的相当直接的移植。                                                                                                                                                                                                                             |
| `BasicLayout`/`VerticalLayout`/`HorizontalLayout`/`TileLayout` | 同名类，算法结构基本一致（百分比分配、间距/内边距、`elementSizeTable` 虚拟布局） | 相当接近的算法移植，包括 `flexChildrenProportionally` 的迭代夹紧法。                                                                                                                                                                                                         |
| 命名空间混入/原型拷贝的继承模型                                | 标准 TypeScript 类继承 + 显式委托（`UIState`、`ILayoutTarget`）                  | 这是整个包最大的架构决策，不是某个具体功能点的差异——第一节已经详述。                                                                                                                                                                                                         |

**Egret EUI 里没有直接对应物、属于全新设计的部分：**

- `IThemeAdapter` 作为可在 `Theme` 构造函数注入的接口（Egret 把网络加载
  策略焊死在框架里）。
- 委托模式本身：`IUIOwner`/`UIState` 作为一个可以独立于任何具体
  DisplayObject 子类存在的状态机对象，被 `Group`/`Component` 各自持有一份
  （`this.ui`），而不是把校验状态直接塞进一个公共基类——这正是
  `Group`/`Component` 能在只有 1 层继承的情况下都实现 `ILayoutTarget`
  的原因。
- `Skin` 作为非视觉数据持有者的设计（前面已详述）——这是相对 Egret
  "皮肤即容器"模型的刻意偏离。

---

## 八、测试覆盖

`test/` 下 26 个文件，共 223 个测试用例。按覆盖领域分组：

| 领域               | 覆盖的文件                                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 校验/主题基础设施  | `sanity`、`Theme`、`Validator`                                                                                                   |
| 皮肤与状态         | `Skin`、`SkinAlignment`（针对真实 CLI 模板皮肤的集成测试）、`AddItems`                                                           |
| 数据绑定           | `Binding`、`Watcher`                                                                                                             |
| 集合与数据驱动组件 | `ArrayCollection`、`DataGroup`、`ListBase`、`ItemRenderer`、`ComboBox`、`TabBar`、`ViewStack`                                    |
| 具体组件           | `RadioButton`、`Range`、`Slider`、`ProgressBar`、`Scroller`、`Label`、`TextInput`                                                |
| 跨组件行为         | `Enabled`（enabled/touchEnabled/touchChildren 的 egret 对齐回归测试）、`EventMapOverride`、`GestureLifecycle`、`TransformLayout` |

**已知覆盖缺口**：没有独立的 `Group.test.ts`（`Group` 的状态机只是通过
`DataGroup`/`ListBase`/`ViewStack` 的测试间接被覆盖）；没有针对布局算法
本身的独立测试文件（没有 `VerticalLayout.test.ts`/`TileLayout.test.ts`），
布局正确性目前只通过 `TransformLayout.test.ts`、`Scroller.test.ts`、
`SkinAlignment.test.ts` 这类组件级测试间接验证。如果要专门补测试，这两块
是优先级最高的空白。

`examples/benchmark/` 另外提供真实 Chromium 中的 UI 性能验证，覆盖 400
节点静态界面、240 节点 transform/alpha 动画和 10,000 条数据的虚拟列表。
它分别记录 frame/render time、draw calls、校验阶段调用和 ItemRenderer
创建/复用；该 benchmark 是自身回归基线，不承担跨 UI 框架排名。
