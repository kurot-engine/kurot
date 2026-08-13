# Kurot Agent-Native 游戏生成路线图

> 状态：规划草案  
> 日期：2026-08-13  
> 目标读者：Kurot 维护者、贡献者与负责生成游戏的 AI Agent

## 1. 愿景

Kurot 的目标不是成为 PixiJS 的替代品，也不是单纯让 AI 更容易调用一组
渲染 API，而是成为一个面向 Agent 的 2D 游戏运行与生成环境：AI Agent
能够把自然语言中的游戏意图稳定地转化为可运行、可检查、可迭代、可交付的
游戏。

完整闭环如下：

```text
自然语言需求
  → 结构化游戏规格
  → 项目与代码生成
  → 构建与启动
  → 语义检查
  → 自动操作与截图
  → 行为/视觉评测
  → 诊断与修复
  → 可交付游戏
```

Kurot 当前已经具备 `core`、`ui`、`game`、`cli` 四层基础，并拥有质量较高的
AI 上下文文档。下一阶段的关键不是继续堆叠底层 API，而是依次解决以下问题：

1. Agent 是否能确定性地创建、构建和启动项目；
2. Agent 是否能找到完成任务的唯一推荐模式；
3. Agent 是否能观察并操作运行中的游戏；
4. Agent 是否能通过高层游戏语义组合玩法；
5. Agent 是否能生成结构化游戏规格，而不是大量胶水代码；
6. Agent 是否能自动试玩、评价并修复结果。

## 2. 当前判断

### 2.1 已有优势

- `packages/*/docs/ai-context.md` 已记录目录职责、公开 API、非直觉行为和任务到文件映射；
- TypeScript、ESM、严格类型、禁止 `any` 等规则有利于 Agent 局部修改和编译期校验；
- `core + ui + game + cli` 覆盖了从运行时到应用构建的纵向链路；
- EUI/EXML、主题、布局、资源、Tween、MovieClip、粒子等能力比纯渲染库更接近游戏应用；
- Kurot 能同时控制运行时、脚手架、构建器和未来的测试协议。

### 2.2 当前不足

- 现有 AI 文档主要帮助 Agent 维护引擎，还没有系统地帮助 Agent 生成游戏；
- 缺少按任务触发、按需加载的 Agent Skills；
- 示例数量少，缺少小型、单目的、可运行、可验证的黄金模式；
- CLI 存在网络依赖、静默降级和开发/发布行为不一致等不确定性；
- 构建成功无法证明游戏行为或视觉结果正确；
- 缺少显示树查询、状态读取、输入注入、确定性时间和自动截图接口；
- 当前 `@kurot/game` 是功能集合，还不是统一的高层游戏框架；
- 尚无版本化、可验证、可编译的游戏语义格式；
- 尚无量化 Agent 成功率的评测集。

### 2.3 产品定位

PixiJS 重点解决“Agent 如何正确使用现代 2D 渲染 API”。Kurot 应当解决：

> Agent 如何表达完整游戏意图，并通过 Kurot 生成、运行、检查和持续改进游戏。

因此，Kurot 不以覆盖 PixiJS 的全部功能或 Skills 为竞争目标，而以完整游戏生成
的闭环成功率为核心指标。

## 3. 目标架构

### 3.1 Kurot Runtime

现有包继续负责底层能力：

- `@kurot/core`：显示树、渲染、事件、资源、文字、网络和媒体；
- `@kurot/ui`：布局、组件、皮肤、主题、状态和绑定；
- `@kurot/game`：Tween、MovieClip、ScrollView、粒子和 URLLoader；
- `@kurot/cli`：项目创建、构建、EXML 编译和开发服务器。

### 3.2 Kurot Gameplay Framework

建议新增 `@kurot/gameplay`，作为 Agent 生成游戏时的主要编程接口，负责：

- Game 与 Scene 生命周期；
- 输入动作映射；
- 确定性时钟与随机数；
- 摄像机；
- 碰撞查询；
- 对象池；
- 可观察游戏状态；
- 常用 gameplay 组件与行为。

### 3.3 Kurot Agent Protocol

建议新增开发期包 `@kurot/agent`，提供：

- ready 信号；
- 语义对象注册与查询；
- 显示状态和游戏状态快照；
- 输入注入；
- 手动推进时间；
- 截图；
- 结构化诊断；
- 行为断言。

该能力不得进入生产包，或必须在生产构建中默认禁用并可被 tree-shaking 移除。

### 3.4 Kurot Semantic Format

建议在高层 TypeScript API 稳定后引入 `game.kurot.yaml`。它用于描述“游戏是什么”，
而不是逐行描述代码“怎么写”。其内部应先归一化为版本化的 Semantic IR，再生成
TypeScript/ESM 并交给现有构建链路。

### 3.5 Skills、Recipes 与 Eval

- Skills 负责把用户任务路由到正确知识；
- Recipes 提供可运行、可复制的黄金实现；
- Eval 负责衡量生成成功率、错误类型和修复成本；
- Agent Protocol 负责验证游戏是否真正正确。

## 4. 核心原则

1. **可验证性优先于生成规模。** 构建成功不等于游戏正确。
2. **高层语义优先于更多底层 API。** 减少 Agent 必须生成的代码量。
3. **一个概念只有一种默认推荐写法。** 其他写法可以存在，但不进入主要生成路径。
4. **明确失败优于静默容错。** Agent 必须能区分警告、降级和功能缺失。
5. **配置与运行实例分离。** 配置可序列化、可验证，实例负责生命周期。
6. **先稳定 TypeScript API，再设计 Semantic IR，最后设计 YAML 表达。**
7. **所有文档示例都应进入 CI。** 防止 Skills 和 Recipes 随版本漂移。
8. **Agent 不依赖内部 `$` API。** 需要的观测能力通过正式协议提供。
9. **开发期可观察，生产期零侵入。** Agent Bridge 不成为生产运行时负担。
10. **用评测决定优先级。** 不以文档数量、生成代码量或演示效果替代真实成功率。

## 5. 北极星指标

核心指标定义为：

> 在全新上下文中，Agent 只根据一次游戏需求描述，无需人工解释 Kurot API，最终通过自动行为和视觉验收的任务比例。

每个评测任务至少记录：

- 首次构建成功率；
- 首次运行成功率；
- 行为验收成功率；
- 视觉验收成功率；
- 平均修复轮数；
- Token 消耗；
- 总执行时间；
- 虚构 API 数量；
- 内部 API 使用次数；
- Egret/PixiJS 错误模式出现次数；
- 最终代码复杂度。

## 6. 分阶段路线

| 阶段 | 目标 | 估算工作量 | 主要产物 |
| --- | --- | ---: | --- |
| 0 | 建立真实基线 | 1–2 工程周 | AgentBench、指标、基准报告 |
| 1 | 修平现有开发路径 | 2–4 工程周 | 确定性 CLI、严格诊断、标准模板 |
| 2 | 建立 Skills 与 Recipes | 3–5 工程周 | 12 个 Skills、20 个黄金样例 |
| 3 | 建立 Agent 验证闭环 | 4–7 工程周 | inspect/input/time/screenshot/assert |
| 4 | 引入游戏语义运行时 | 6–10 工程周 | Scene、Input、Collision、Camera 等 |
| 5 | 设计并实现 Semantic IR | 5–8 工程周 | Schema、编译器、源码追踪 |
| 6 | 建立完整游戏模板 | 6–10 工程周 | 四类游戏端到端生成 |
| 7 | 持续评测与生态化 | 持续 | 回归测试、版本化 Skills、兼容矩阵 |

单人全职做到有说服力的第一版，预计需要 6–10 个月。完成阶段 0–3 后即可形成
2–4 个月规模的可演示原型。时间仅作为工程量级参考，阶段是否完成以验收指标为准。

## 7. 阶段 0：AgentBench 基线

### 7.1 目录建议

```text
agent-evals/
├── tasks/
│   ├── basic/
│   ├── interaction/
│   ├── ui/
│   ├── gameplay/
│   └── debugging/
├── fixtures/
├── runners/
├── rubrics/
└── reports/
```

### 7.2 第一批 30 个任务

基础任务：

1. 创建空项目并运行；
2. 绘制背景、矩形和文字；
3. 加载并显示图片；
4. 创建点击按钮；
5. 创建补间动画；
6. 响应窗口尺寸变化；
7. 播放音效；
8. 加载资源组并显示进度。

交互任务：

9. 拖动对象；
10. WASD 移动；
11. 长按连续射击；
12. 双击冲刺；
13. 多点触控；
14. 暂停与恢复。

UI 任务：

15. 创建 HUD；
16. 创建滚动列表；
17. 创建背包格子；
18. 创建设置弹窗；
19. 数据变化后更新血条；
20. 切换 UI 状态。

游戏任务：

21. 玩家追踪摄像机；
22. 敌人追踪玩家；
23. 子弹击中敌人；
24. 对象池复用子弹；
25. 波次生成敌人；
26. 计分和胜负条件。

调试任务：

27. 修复错误资源名；
28. 修复事件未触发；
29. 修复动画速度与帧率绑定；
30. 修复暂停后逻辑仍推进。

### 7.3 对照组

每个任务至少运行三组：

1. 只有 TypeScript 类型和普通 README；
2. 使用现有 `AGENTS.md` 和 `ai-context.md`；
3. 使用新 Skills、Recipes 和 Agent Protocol。

### 7.4 阶段出口

- 至少 30 个固定任务；
- 每个任务有机器可执行的验收条件；
- 测试可重复执行并输出统一报告；
- 可以比较不同模型、Kurot 版本和 Skill 版本。

## 8. 阶段 1：确定性的 CLI 与应用入口

### 8.1 非交互式项目创建

目标命令：

```bash
kurot create my-game \
  --template game \
  --package-manager pnpm \
  --no-install \
  --offline \
  --json
```

要求：

- 无交互；
- 离线可用；
- 版本确定；
- 退出码可靠；
- 支持机器可读输出；
- 模板可枚举；
- 目标冲突产生结构化错误；
- 不在网络失败后静默写入 `latest`。

CLI 应内建一份经过验证的 Kurot 包兼容矩阵，而不是依赖创建时访问 npm registry。

### 8.2 标准应用入口

为常见初始化流程提供高层封装，同时保留底层 `createPlayer()`：

```ts
const game = await createGame({
  canvas: '#gameCanvas',
  stage: {
    width: 1280,
    height: 720,
    scaleMode: 'showAll',
  },
  resources: {
    config: 'resource/default.res.json',
    preload: ['preload'],
  },
  theme: 'resource/default.thm.json',
});

await game.start(MainScene);
```

该入口统一 Player、资源、主题、加载界面和首场景生命周期，减少 Agent 重复生成
易错的初始化胶水代码。

### 8.3 结构化诊断

目标命令：

```bash
kurot build --strict --diagnostics json
kurot dev --strict --diagnostics json
kurot doctor --json
```

诊断格式至少包含：

```json
{
  "success": false,
  "diagnostics": [
    {
      "code": "KUROT_EXML_UNKNOWN_TAG",
      "severity": "error",
      "file": "resource/skins/MainSkin.exml",
      "line": 12,
      "column": 5,
      "message": "Unknown component: eui:Foo",
      "suggestions": ["Check the tag name", "Register a custom namespace"]
    }
  ]
}
```

严格模式需要显式处理：

- 未知 EXML 标签；
- 开发模式皮肤编译失败；
- 资源配置不存在；
- theme 或 EXML 配置不一致；
- 资源引用无法解析；
- `--watch` 与 release 冲突；
- 构建步骤产生的功能性降级。

### 8.4 `kurot doctor`

检查范围：

- Node 与包管理器版本；
- Kurot 包版本兼容性；
- 入口和 HTML canvas；
- resource/theme 路径；
- EXML namespace；
- 重复资源名；
- 未解析资源引用；
- 默认 skin；
- 构建输出配置。

### 8.5 默认项目结构

```text
src/
├── main.ts
├── game/
│   ├── Game.ts
│   ├── scenes/
│   ├── entities/
│   ├── systems/
│   └── config/
├── ui/
├── assets/
└── tests/
```

该结构是生成路径的唯一默认推荐，不强制所有手写项目采用。

### 8.6 阶段出口

- Agent 能无交互创建、构建和启动项目；
- 所有重要错误拥有稳定错误码；
- 严格模式不允许静默丢失功能；
- 基础评测任务首次运行成功率达到 80%。

## 9. 阶段 2：Skills 与黄金 Recipes

### 9.1 Skills 结构

```text
skills/
├── kurot/
├── kurot-create/
├── kurot-application/
├── kurot-display/
├── kurot-input/
├── kurot-assets/
├── kurot-ui/
├── kurot-animation/
├── kurot-gameplay/
├── kurot-exml/
├── kurot-performance/
└── kurot-debugging/
```

`kurot` 是入口和路由器，不承载全部 API 细节。其余 Skills 按用户任务加载。

### 9.2 Skill 内容规范

每个 Skill 至少包括：

- 触发条件；
- 支持的包和版本；
- 唯一默认推荐模式；
- 最小可运行示例；
- 禁止使用的旧模式；
- 常见 Egret/PixiJS 幻觉；
- 构建和运行验证命令；
- 常见错误码与修复；
- 关联 Recipes 与其他 Skills。

建议结构：

```text
SKILL.md
references/
├── api-patterns.md
├── mistakes.md
├── recipes.md
└── diagnostics.md
```

### 9.3 Recipes

Recipes 是可构建的黄金项目或模块，不只是代码片段：

```text
recipes/
├── pointer-drag/
├── keyboard-movement/
├── camera-follow/
├── bullet-pool/
├── enemy-wave/
├── health-bar/
├── modal-dialog/
├── inventory-grid/
├── scene-transition/
└── save-load/
```

每个 Recipe 包含：

- 最小源码；
- 使用说明；
- 自动测试；
- 预期截图；
- 预期行为；
- 适用版本；
- Agent 修改任务。

首批完成 20 个高频 Recipes：应用初始化、资源、Sprite、Graphics、文字、点击、
拖动、键盘、ticker、Tween、MovieClip、按钮、HUD、列表、场景切换、摄像机、
碰撞、对象池、存档和暂停。

### 9.4 阶段出口

- Skills 可被主流标准 Agent 安装；
- 20 个 Recipes 均能独立构建；
- Skills 声明明确的 Kurot 版本范围；
- Kurot 发版时自动验证全部 Recipes；
- 评测中的虚构 API 数量下降至少 70%。

## 10. 阶段 3：Agent 验证闭环

### 10.1 Agent Bridge

开发环境暴露受控接口，建议使用 `globalThis.__KUROT_AGENT__` 作为浏览器自动化
入口，但正式 TypeScript API 位于 `@kurot/agent`。

```ts
interface KurotAgentBridge {
  ready(): Promise<void>;
  inspect(): AgentSnapshot;
  find(query: AgentQuery): readonly AgentNode[];
  getState(): Readonly<Record<string, unknown>>;
  dispatch(action: AgentAction): void;
  advanceTime(milliseconds: number): void;
  capture(): Promise<Blob>;
  diagnostics(): readonly AgentDiagnostic[];
}
```

### 10.2 语义注册

Agent 不应依赖对象类名、显示树索引或内部字段。建议使用独立 registry：

```ts
agentRegistry.describe(player, {
  id: 'player',
  role: 'player',
  tags: ['controllable', 'damageable'],
});
```

UI 示例：

```ts
agentRegistry.describe(startButton, {
  id: 'start-button',
  role: 'button',
  label: 'Start Game',
});
```

### 10.3 Snapshot

输出稳定、可序列化、无循环引用的语义数据：

```json
{
  "scene": "battle",
  "viewport": { "width": 1280, "height": 720 },
  "nodes": [
    {
      "id": "player",
      "role": "player",
      "visible": true,
      "bounds": [540, 300, 64, 64],
      "state": { "health": 80, "moving": false }
    }
  ]
}
```

### 10.4 语义输入

```ts
bridge.dispatch({ type: 'press', action: 'move-left' });
bridge.dispatch({ type: 'release', action: 'move-left' });
bridge.dispatch({ type: 'tap', target: 'start-button' });
bridge.dispatch({ type: 'drag', target: 'card-1', to: [500, 300] });
```

同时保留低层坐标事件用于最终端到端测试，但 Agent 的主要生成和诊断路径使用语义动作。

### 10.5 确定性时间与随机数

```ts
game.clock.pause();
game.clock.advance(1000);
game.random.seed(42);
```

统一推进 Tween、MovieClip、粒子、游戏逻辑、延时任务和渲染帧。官方 gameplay
组件不得直接依赖 `Math.random()` 或真实 `requestAnimationFrame`。

### 10.6 行为断言

```ts
await scenario(game)
  .press('move-right', 1000)
  .expectPosition('player', { x: 240, tolerance: 2 })
  .tap('pause-button')
  .advance(2000)
  .expectUnchanged('player.position');
```

### 10.7 阶段出口

- Agent 能确认游戏 ready；
- 能读取语义状态和对象 bounds；
- 能模拟语义操作；
- 能确定性推进时间；
- 能截图并读取诊断；
- 至少 20 个行为任务完全自动验收；
- 平均人工检查次数下降 80%。

## 11. 阶段 4：`@kurot/gameplay`

### 11.1 第一批核心抽象

#### Game 与 Scene

```ts
class BattleScene extends Scene {
  enter(context: SceneContext): Promise<void> {
    // Load scoped resources and create the scene.
  }

  update(delta: number): void {
    // Update gameplay.
  }

  exit(): Promise<void> {
    // Release scoped state.
  }
}
```

Scene 统一显示根、资源范围、暂停、输入上下文、实体管理、切换与销毁。

#### GameClock

提供 delta、timeScale、pause、fixed update、调度任务和手动推进。

#### InputMap

```ts
input.define('move-left', [
  keyboard('ArrowLeft'),
  keyboard('KeyA'),
]);

input.define('attack', [
  keyboard('Space'),
  pointer('primary'),
]);
```

游戏逻辑只消费 `move-left`、`attack` 等语义动作。

#### Camera2D

支持 follow、dead zone、bounds、zoom、shake 和坐标转换。

#### CollisionWorld

第一版仅支持 AABB、circle、layer/mask、enter/stay/exit、spatial hash 和 query。
不在此阶段引入完整物理引擎。

#### ObjectPool

统一实例创建、获取、回收、重置和销毁行为。

#### StateStore

提供可观察、可序列化、可供 UI、存档和 Agent inspect 使用的游戏状态。

### 11.2 第二批行为组件

- Movement2D；
- FollowTarget；
- Health 与 Damage；
- Projectile；
- Lifetime；
- Spawner；
- WaveController；
- Cooldown；
- Inventory；
- Quest；
- StateMachine；
- Dialogue；
- SaveSlot。

这些组件应采用可序列化配置，为 Semantic IR 提供稳定编译目标。

### 11.3 API 设计要求

- 构造参数使用配置对象；
- 避免位置布尔参数；
- 使用判别联合；
- 默认值安全；
- 生命周期明确；
- 错误尽早抛出；
- 配置与实例分离；
- dispose/remove 语义统一；
- 示例可原样构建运行。

```ts
const spawner = new Spawner({
  prefab: 'slime',
  interval: 2000,
  limit: 20,
});
```

### 11.4 阶段出口

Agent 无需手写底层 ticker、输入监听和碰撞循环即可完成玩家移动、敌人追踪、
子弹攻击、生命值、波次、暂停和场景切换。游戏评测任务首次行为通过率达到 70%。

## 12. 阶段 5：Semantic IR 与 DSL

### 12.1 实施顺序

```text
稳定的高层 TypeScript API
  → 可序列化配置对象
  → JSON Schema
  → Semantic IR
  → YAML 表达
  → 自然语言生成
```

不应先设计覆盖所有类型游戏的 YAML，再反向要求运行时适配。

### 12.2 IR 模型

```ts
interface GameIR {
  schemaVersion: string;
  metadata: GameMetadata;
  viewport: ViewportIR;
  assets: readonly AssetIR[];
  scenes: readonly SceneIR[];
  prefabs: readonly PrefabIR[];
  input: readonly InputActionIR[];
  state: readonly StateFieldIR[];
  rules: readonly RuleIR[];
  tests: readonly ScenarioIR[];
}
```

### 12.3 语义文件示例

```yaml
schemaVersion: "1"

game:
  id: slime-survivor
  title: Slime Survivor

viewport:
  width: 1280
  height: 720
  scaleMode: showAll

input:
  move-left:
    - keyboard: KeyA
    - keyboard: ArrowLeft
  attack:
    - keyboard: Space

prefabs:
  player:
    display:
      sprite: hero
    components:
      movement:
        speed: 240
      health:
        maximum: 100
      collision:
        shape: circle
        radius: 24
        layer: player

scenes:
  battle:
    entities:
      - prefab: player
        id: player
        position: [640, 360]
    systems:
      - type: enemy-wave
        prefab: slime
        interval: 2s
        limit: 20

rules:
  - when:
      event: player.health.empty
    then:
      - show: game-over
      - pause: gameplay
```

### 12.4 编译流程

```text
game.kurot.yaml
  → parse
  → schema validate
  → normalize
  → GameIR
  → TypeScript/ESM
  → esbuild
```

选择生成 TypeScript/ESM 而非完全运行时解释，以保留类型检查、tree-shaking、可读产物
和较清晰的调试栈。

### 12.5 错误定位与源码追踪

编译器错误和运行时错误必须映射回语义文件位置：

```text
KUROT_PREFAB_NOT_FOUND
Spawner prefab "slime" was not found.
Source: game.kurot.yaml:42:17
```

生成代码应保留来源信息，以支持 Agent 精确修改原始语义节点。

### 12.6 手写扩展

DSL 不追求表达所有独特玩法，允许引用 TypeScript：

```yaml
components:
  boss-ai:
    script: ./src/game/BossAI.ts
    export: BossAI
```

常见行为数据化，独特玩法使用 TypeScript，两者可以组合并共同接受自动验收。

### 12.7 阶段出口

- Schema 有明确版本；
- IR 可以稳定编译；
- 错误映射回 YAML；
- 至少覆盖两个完整小型游戏；
- 生成代码不调用内部 `$` API；
- 手写 gameplay 组件可由 IR 引用。

## 13. 阶段 6：完整游戏模板

按复用价值依次实现：

### 13.1 Top-down action

验证输入、摄像机、碰撞、敌人、子弹、波次、HUD、暂停和胜负条件。

### 13.2 Tower defense

验证路径、放置、目标选择、升级、经济、波次、大量对象和复杂 UI。

### 13.3 Card/battle

验证数据驱动、状态机、动画队列、拖放、回合规则和存档。

### 13.4 Visual novel

验证对话、分支、资源切换、音频、存档和文本数据化。

第一批不优先实现平台跳跃模板，以避免路线过早被连续碰撞、地形、物理反馈和
关卡编辑器绑架。

每个完整模板必须包含：

- 可玩游戏；
- Semantic IR；
- 生成后的 TypeScript；
- 自动行为测试；
- 截图基准；
- Agent 修改任务；
- 性能预算；
- 发布构建。

### 13.5 阶段出口

对于“创建一个俯视角生存游戏，玩家 WASD 移动，自动攻击最近敌人，每 20 秒增强
敌人，存活 3 分钟获胜”这类请求，Agent 能自动完成：

1. 选择模板；
2. 生成 IR；
3. 验证 Schema；
4. 生成项目；
5. 构建并启动；
6. 自动移动和攻击；
7. 推进游戏时间；
8. 验证胜负条件；
9. 截图检查；
10. 修复失败；
11. 交付可玩版本。

## 14. 版本和兼容策略

Skills、Runtime 与 Schema 必须独立版本化并声明兼容范围：

```yaml
kurot:
  core: ">=1.1 <2"
  ui: ">=1.2 <2"
  game: ">=1.1 <2"
  gameplay: ">=0.1 <1"
  schema: "1"
```

每次发版 CI 必须运行：

- 所有包测试；
- 所有 Recipes 构建；
- 所有游戏模板构建；
- Semantic IR fixtures；
- Agent Bridge 行为测试；
- 关键浏览器端到端测试；
- Skills 代码片段类型检查；
- 文档 API 引用检查。

Skills 中的代码示例应作为真实源码参与 CI，不能只存在于 Markdown。

## 15. 建议的仓库演进

短期不为了本路线强行把现有仓库改造成统一 pnpm workspace。先增加以下区域：

```text
Kurot/
├── packages/
│   ├── core/
│   ├── ui/
│   ├── game/
│   ├── gameplay/
│   ├── agent/
│   └── cli/
├── skills/
├── recipes/
├── agent-evals/
├── schemas/
└── examples/
```

等 Skills 和 Agent Eval 稳定后，再根据发布和贡献需求评估是否拆分为独立仓库。

## 16. 暂不进入关键路径的事项

- 不为了 AI 重写底层渲染器；
- 不追求与 PixiJS 全面 API 对齐；
- 不先实现通用 ECS；
- 不先引入完整物理引擎；
- 不先开发可视化编辑器；
- 不先设计覆盖所有游戏类型的 DSL；
- 不先实现多 Agent 协作协议；
- 不把内部架构文档机械转换成大量 Skills；
- 不以生成代码量作为成功指标；
- 不允许 Agent Bridge 默认进入生产包。

WebGPU、压缩纹理、滤镜扩展等渲染能力可以独立推进，但不属于 Agent-native 路线
的关键路径。

## 17. 第一个实施迭代

建议第一轮控制在 2–3 工程周，目标是得到真实数据，而不是立即设计完整 DSL。

### 17.1 建立 10 个初始评测任务

- 创建项目；
- 显示文字；
- 加载图片；
- 点击按钮；
- 拖动；
- Tween；
- WASD；
- HUD；
- 暂停；
- 简单敌人追踪。

### 17.2 CLI 最小改进

```bash
kurot create --offline --json
kurot build --strict --diagnostics json
kurot doctor --json
```

### 17.3 首批三个 Skills

- `kurot`；
- `kurot-create`；
- `kurot-application`。

### 17.4 首批五个 Recipes

- `hello-game`；
- `load-assets`；
- `pointer-drag`；
- `keyboard-movement`；
- `pause-resume`。

### 17.5 最小 Agent Bridge

首版只实现：

```text
ready
inspect
dispatch
advanceTime
diagnostics
```

### 17.6 第一次对照评测

比较无 Kurot 上下文、现有 AI 文档、新 Skills/Recipes/Bridge 三组结果。

第一轮成功标准：

- 10 个任务均能自动执行；
- 创建、构建和启动无需人工输入；
- 运行错误结构化返回；
- Agent 能可靠判断游戏 ready；
- 首次运行成功率提高至少 20 个百分点；
- 平均修复轮数下降至少 30%。

如果没有达到这些指标，继续修复 CLI、Skills、Recipes 和验证工具，不进入 Semantic
IR 阶段。

## 18. 成熟度里程碑

### M1：AI-readable

Agent 能准确理解 Kurot。当前 `ai-context.md` 已使项目接近该阶段。

### M2：AI-usable

Agent 能稳定使用 Kurot 完成局部功能。依赖 Skills、Recipes 和严格 CLI。

### M3：AI-testable

Agent 能自动运行、操作、观察和验证游戏。依赖 Agent Protocol、确定性时间与行为测试。

### M4：AI-composable

Agent 能使用高层 gameplay 组件组合玩法。依赖 `@kurot/gameplay`。

### M5：AI-semantic

Agent 主要生成结构化游戏意图，而不是大量底层胶水代码。依赖 Semantic IR、Schema
和编译器。

### M6：AI-generative

Agent 能持续执行需求理解、游戏生成、自动试玩、评价和修改，最终交付完整游戏。

## 19. 决策门槛

进入下一阶段前必须回答：

1. 当前阶段是否改善了 AgentBench 的真实指标？
2. 改善来自通用能力，还是只针对演示任务硬编码？
3. 新 API 是否减少了生成代码和歧义？
4. 错误是否能由 Agent 自行定位和修复？
5. 新能力是否拥有确定性测试和版本约束？
6. 是否有更小、更直接的能力可以达到相同效果？

如果不能通过这些门槛，不因路线表或发布时间强行进入下一阶段。

## 20. 最终成功定义

Kurot 的 Agent-native 目标达成，不以“提供了 Skills”或“可以从提示词生成项目”作为
标准，而以以下闭环是否稳定成立为标准：

```text
用户描述游戏
  → Agent 生成可验证规格
  → Kurot 编译并运行
  → Agent 自动试玩与观察
  → 系统给出结构化诊断
  → Agent 修复规格或扩展代码
  → 行为、视觉和性能验收通过
  → 发布可玩游戏
```

在此路线中，长期优先级始终是：

```text
可验证性
  > 高层游戏语义
  > 黄金范例
  > Skills
  > 底层 API 覆盖率
```

这条路线利用 Kurot 对 runtime、UI、game 和 CLI 的纵向控制能力，将其发展为一个
可观察、可操作、可确定性测试、可由语义规格驱动的 Agent-native 2D 游戏引擎。
