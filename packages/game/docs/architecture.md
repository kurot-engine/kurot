# @kurot/game 架构文档

> 当前版本：1.0.6。逐条变更记录见 [CHANGELOG.md](../CHANGELOG.md)。
> 面向 AI 智能体的速查文档见 [ai-context.md](./ai-context.md)（目录地图、反直觉行为清单、术语表、任务→文件速查表）。本文档面向人类读者，讲设计动机与内部机制，两份文档不重复内容，互相引用。

---

## 一、项目概述

`@kurot/game` 是 [`@kurot/core`](../../core/docs/architecture.md) 之上的游戏扩展层，
提供核心引擎不内置的高层能力：链式属性动画（Tween）、外部驱动的序列帧动画
（MovieClip）、惯性滚动容器（ScrollView）、粒子系统、以及 Egret 兼容的网络加载
封装（URLLoader）。

对 `@kurot/core` 是 `peerDependency`，不打包进产物，由使用方显式安装并控制
版本，避免多份 core 实例共存。

设计上贯穿全包的一个取舍：**尽量不在包内部持有隐藏的全局状态或计时器**，
调度权交还给调用方或 core 的 `ticker`，具体见第三节。

---

## 二、模块结构

```
packages/game/src/kurot/
├── tween/       链式属性动画
│   ├── Tween.ts        核心类：get() 工厂、step 队列、pause/resume/seek、thenable
│   ├── TweenGroup.ts    命名分组管理，自动感知成员完成/移除
│   ├── Ease.ts          缓动函数库（linear/sine/quad/.../elastic/bounce/cubicBezier）
│   └── types.ts         TweenOptions、EaseFunction、Step 判别联合类型
├── display/     序列帧动画 + 滚动容器
│   ├── MovieClip.ts             显示对象，外部驱动的帧步进（不含 ticker）
│   ├── MovieClipData.ts          帧数据容器：frame/label/event，0-based 索引
│   ├── MovieClipDataFactory.ts   Egret mc/res JSON → MovieClipData 转换器
│   ├── MovieClipTextureParser.ts 帧纹理裁剪策略接口 + Egret 默认实现
│   └── ScrollView.ts             惯性滚动容器：触摸采样、阻力/回弹、可选 tween 滚动
├── particle/    粒子系统
│   ├── Particle.ts                 基础粒子字段（x/y/scale/rotation/alpha/生命周期）
│   ├── GravityParticle.ts          扩展字段：velocity/radial/tangential 加速度
│   ├── ParticleSystem.ts           模板方法基类：对象池、发射节奏、ticker 注册
│   └── GravityParticleSystem.ts    Particle-Designer 风格的重力/径向/切向物理实现
└── net/         网络加载
    ├── URLLoader.ts          按 dataFormat 路由到 core 的 HttpRequest/ImageLoader/Sound
    ├── URLRequest.ts          method/url/data/headers
    ├── URLVariables.ts        查询字符串编解码（自定义正则解析，非 URLSearchParams）
    ├── URLRequestHeader.ts
    ├── URLRequestMethod.ts
    └── URLLoaderDataFormat.ts
```

Public API 按上述四个子模块分组从 `src/index.ts` 导出，完整清单见
`ai-context.md` 第 4 节。

---

## 三、调度模型：两种 ticker 注册粒度

包内两个需要按帧驱动的子系统采用了**不同粒度**的 core `ticker` 注册策略，
这是理解本包运行时行为最关键的一点。

### 3.1 Tween — 全局共享单一注册

```
Tween.get(target)
  → _addActive(tween)
    → 若 _activeTweens.size 从 0 变为 1
      → ticker.startTick(_globalTick, null)   一次性注册

_globalTick(deltaTime)
  → 遍历 _activeTweens 的浅拷贝快照（允许回调内增删）
  → 每个 tween._tick(deltaTime)

tween 完成/移除 → _removeActive(tween)
  → 若 _activeTweens.size 变为 0
    → ticker.stopTick(_globalTick)            注销
```

无论创建多少个 `Tween` 实例，整个进程只有一个 `_globalTick` 回调注册在
core 的 ticker 上。这是一个有意的设计：避免为每个短生命周期的 tween
（常见场景是同时有几十个 UI 过渡动画）都单独注册/注销一次回调。

### 3.2 ParticleSystem — 按实例注册

```
particleSystem.start()
  → ticker.startTick(this._update, this)      每个实例各自注册

particleSystem.stop(clear = false)
  → 停止新粒子发射，但不注销 ticker，等存量粒子自然过期
particleSystem.stop(clear = true)
  → 立即清空粒子 + 注销 ticker
```

`ParticleSystem` 走的是相反的策略：每个实例独立注册/注销。这是因为粒子系统
通常数量少（一个场景可能只有几个爆炸/烟雾效果），且各自的生命周期、发射
节奏差异很大，按实例注册反而更简单、也不需要维护一个共享的活跃集合。

### 3.3 MovieClip — 完全不接触 ticker

`MovieClip` 既不注册 core 的 ticker，也不自己计时。它只暴露
`advanceFrame()`，把"什么时候算过了一个逻辑帧"这个决策完全交给调用方的
外部调度器（参见 README 的 `ENTER_FRAME` 累加器示例）。这样多个 MovieClip
可以共享同一个逻辑帧率，也可以按需支持不同帧率的动画共存，而不需要在每个
MovieClip 内部维护独立的计时状态。

**记忆要点：三个子系统对"谁负责触发帧步进"给出了三种不同答案** ——
Tween 共享一个全局回调，ParticleSystem 每实例一个回调，MovieClip 完全不
用回调、由调用方显式驱动。不要把其中一种的行为套用到另外两种上。

---

## 四、Tween 内部机制

### 4.1 Step 队列与判别联合

`Tween` 内部维护一个 step 数组，每个 step 是 `ToStep` / `FromStep` /
`WaitStep` / `CallStep` / `SetStep` 之一（定义于 `types.ts`），共享
`duration` 字段（`call`/`set` 恒为 0）。`_tick()` 用 `do...while` 循环消费
时间，允许单次较大的 `deltaTime`（比如卡顿后恢复）在一帧内跨越多个 step、
甚至多个完整的 repeat 周期。

### 4.2 repeat 与 yoyo 的组合语义

`repeat` 表示**额外**播放的周期数（`repeat: 0` = 播一次，`repeat: -1` =
无限）。`yoyo: true` 时，每个新周期切换一次播放方向；方向反转通过对 step
下标做 `steps.length - 1 - index` 整体重映射实现——即整段 step 序列反向
播放，而不是仅反转属性插值。`call()`/`set()` 这类无时长的即时 step 只在正向
通道执行，反向通道会被显式跳过。

`to()`/`from()` step 的起止值只在**首次用到时**惰性捕获一次，此后固定不变
——外部再修改目标属性也不影响后续 repeat/yoyo 周期动画的目标值。

### 4.3 Thenable 与 seek

`Tween` 实现了 `then()`，可以直接 `await`。Promise 在自然完成或被
`remove()`/`removeTweens()` 移除时都会 resolve（永不 reject），方便把
tween 完成当作一次性异步操作来编排。`setPosition()` 用于跳转到序列中的
任意时间点：会重新应用所有 `to`/`from`/`set` step，但**跳过 `call()`**（避免
重放任意副作用），且总是把方向重置为正向——不能 seek 到一个 yoyo 反向
播放的位置。

---

## 五、MovieClip 数据模型

### 5.1 两套索引约定并存

`MovieClip` 内部帧下标是 0-based，公开的 `currentFrame` 是 1-based
（`= _currentFrameIndex + 1`）。手动构建 `MovieClipData` 时
`setFrameLabel()`/`setFrameEvent()` 用 0-based 下标；而 Egret JSON 里的
label/event 帧号是 1-based，经 `MovieClipDataFactory` 转换时会 `-1`。

### 5.2 Egret 帧数据的 duration 展开

`MovieClipDataFactory` 把 Egret 每个关键帧的整数 `duration` 字段展开成
对应数量的运行时帧（一帧 `duration: 3` 变成 3 个相同的 `MovieClipData`
帧）。Egret 数据里的 label/event 帧号指的是**展开后的逻辑帧**，不是原始
JSON 数组下标——这是最容易出现偏移错误的地方。

### 5.3 外部调度而非自驱动

`MovieClip.advanceFrame()` 只做一件事：把内部帧指针向前推一格，并按需
派发 `FRAME_CHANGE`/`LOOP_COMPLETE`/`COMPLETE` 事件。它从不读取
`frame.duration`——那个字段纯粹是给外部调度器自己做累加器用的时间提示。
`gotoAndPlay(label)` 会把后续循环范围收窄到该 label 声明的区间，直到一次
数字形式的 `gotoAndPlay`/`gotoAndStop` 清除这个范围为止。

---

## 六、ScrollView 的双阻尼模型

`ScrollView` 用两套不同的阻尼常量处理"看起来是一回事"的越界回弹行为：

- **拖拽越界**：用 `RESISTANCE`（0.4）在触摸移动阶段实时压缩超出边界的位移
- **释放后回弹**：用 `SPRING`（0.2）在惯性动画阶段把内容缓动拉回边界内

速度的计算方式是对最近 5 次触摸采样做加权平均（越新的样本权重越高），从
px/ms 换算成 px/frame。此外 `ScrollView` 支持程序化的 tween 滚动
（`setScrollTop`/`setScrollLeft` + `duration`），复用同一个 `ENTER_FRAME`
监听器；触摸驱动的惯性滚动和 tween 滚动互斥，谁先启动就会停掉另一个。

---

## 七、粒子系统的模板方法结构

`ParticleSystem` 是模板方法基类：负责对象池、发射节奏（`emissionRate`，
单位其实是"每个粒子的发射间隔 ms"而不是"每秒发射数"，命名容易引起误解）、
ticker 注册与生命周期。子类只需实现 `initParticle()`/`advanceParticle()`
两个钩子来定义具体物理模型。

`GravityParticleSystem` 是内置的 Particle-Designer 风格实现：径向加速度
沿"当前位置 - 发射起点"方向、切向加速度是径向方向旋转 90° 后的垂直分量、
再加上恒定的线性重力。`maxParticles` 是它计算 `emissionRate =
lifespan / maxParticles` 时的必要输入——缺失该字段会导致除零，
`ParticleSystem` 构造函数会在这种情况下抛出 `RangeError`。

粒子渲染通过一个自定义的 `$renderObjectType` 数值（`6`）扩展 core 的
`RenderObjectType` 枚举，而不修改 core 本身——只看 core 的枚举定义是找不到
这个值的。

---

## 八、URLLoader 的多路后端

`URLLoader` 是 Egret 风格的统一网络加载入口，但内部按 `dataFormat` 把请求
分发到三个完全不同的 core 组件：

| dataFormat            | 实际后端       | `data` 字段的含义                |
| ---------------------- | -------------- | ---------------------------------- |
| `TEXTURE`              | `ImageLoader`  | 包装成 `Texture`                   |
| `SOUND`                | `Sound`        | `Sound` 实例本身，不是原始音频数据 |
| `TEXT`/`BINARY`/`JSON` | `HttpRequest`  | 对应格式的解析结果                 |

只有走 `HttpRequest` 路径的请求才会派发 `ProgressEvent.PROGRESS`；
`TEXTURE`/`SOUND` 路径不支持进度事件。所有失败场景（包括 JSON 解析失败）
统一走 `IOErrorEvent.IO_ERROR` 事件，不会抛出未捕获异常。

`URLRequest.data` 若是 `URLVariables`，GET 请求会拼进查询字符串，POST
请求会序列化成 body 并在没有显式设置 `Content-Type` 时自动加上
`application/x-www-form-urlencoded`——需要发送 JSON body 的调用方应传入
普通字符串而不是 `URLVariables`。

与 Egret 对应模块的差异见根目录 [egret-migration.md](../../../docs/egret-migration.md)。

---

## 九、测试覆盖

`test/` 下按子系统组织：`Tween.test.ts`、`TweenGroup.test.ts`、
`MovieClip.test.ts`、`MovieClipDataFactory.test.ts`、`ScrollView.test.ts`、
`ParticleSystem.test.ts`。运行 `pnpm --dir packages/game test` 查看当前
用例数。
