# 代码规则

所有贡献者必须遵守以下规则。PR 不符合规则将被要求修改。

---

## 1. 语言与运行时

- **TypeScript only**，所有 `.ts` 文件，禁止 `.js` 业务代码。
- 目标 `ES2022`，模块系统 `ESM`（`"type": "module"`）。
- CLI、构建和开发工具使用 `Node.js >= 20` API；引擎运行时以 ES2022 现代浏览器为目标。两者都不写向下兼容代码。
- 使用 `pnpm` 作为包管理器。

## 2. 类型系统

### 2.1 严格模式

`tsconfig.json` 必须 `"strict": true`，不得通过 `as any` / `@ts-ignore` 绕过。新代码禁止新增 `any`；现有 `any` 属于待清理技术债，修改相关代码时优先使用 `unknown`、泛型或明确的结构类型消除。

### 2.2 禁止 null（应用层）

- 应用代码中使用 `undefined` 表示"没有值"，不使用 `null`。
- 函数返回值类型不含 `null`，只含 `T | undefined`。
- 参数可选用 `?` 或 `| undefined`，不用 `| null`。
- **例外**：与 DOM / WebGL 等浏览器 API 交互时，`null` 是规范要求的参数值，必须保留。

```typescript
// 正确 — 应用层：使用 undefined
function findUser(id: string): User | undefined { ... }

// 正确 — DOM/WebGL API 边界：null 是规范要求
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
element.onload = null;  // 解除事件绑定

// 错误 — 应用层使用 null
function findUser(id: string): User | null { ... }
```

### 2.3 明确返回类型

所有**导出函数**必须声明返回类型。

```typescript
// 正确
export function build(config: ProjectConfig): Promise<void> { ... }

// 错误
export function build(config: ProjectConfig) { ... }
```

### 2.4 类型推导优先

局部变量不写类型注解，让 TS 推导：

```typescript
// 正确
const files = await fs.readdir(srcDir);

// 错误
const files: string[] = await fs.readdir(srcDir);
```

## 3. 代码风格

### 3.1 格式化

遵循仓库现有格式。如果当前包提供 `format` script，提交前运行；没有格式化脚本时，至少运行该包的构建、测试与 `git diff --check`。

### 3.2 命名

| 场景                                    | 风格                                 | 示例                                        |
| --------------------------------------- | ------------------------------------ | ------------------------------------------- |
| 导出主 class/interface 的文件名           | `PascalCase`                         | `DisplayObject.ts`                          |
| CLI、配置、工具和功能模块文件名             | `kebab-case`                         | `exml-compiler.ts`                          |
| class / interface / type / enum         | `PascalCase`                         | `ProjectConfig`, `BitmapFillMode`           |
| `const enum`（枚举类型名）              | `PascalCase`                         | `DrawCmdType`                               |
| 函数 / 方法 / 变量                      | `camelCase`                          | `buildProject`, `getOrAssignSlot`           |
| 配置阈值、协议常量和真正不变的常量          | `UPPER_SNAKE_CASE`                   | `MAX_TEXTURES`, `DEFAULT_WIDTH`             |
| 共享实例、单例和可变模块状态                  | `camelCase`                          | `sharedPoint`, `resource`, `ticker`         |
| 私有实例字段                            | `_camelCase`（下划线前缀）           | `_config`, `_slotCount`                     |
| 布尔判断方法/计算状态                     | 优先 `is` / `has` / `should` / `can` | `isFull()`, `hasEui`, `canRender`           |
| 事件回调                                | `on` / `handle` 前缀                 | `onResize`, `handleClick`                   |
| 工厂函数（创建并返回对象）              | `make` / `create` / `from` 前缀      | `makeMultiCmd`, `createPlayer`              |
| 类型参数（泛型）                        | 单大写字母或 `T` 前缀                | `T`, `TValue`, `TResult`                    |
| 新接口（仅用作类型标注）                | 不加 `I` 前缀                        | `TextCache`, `DrawCmd`（不是 `ITextCache`） |

```typescript
// 正确 — 常量命名
public static readonly MAX_TEXTURES = 8;
private static readonly _pool: TextInstruction[] = [];

// 正确 — 布尔命名
public isFull(): boolean { ... }
public get contextLost(): boolean { ... }
public visible = true;
public smoothing = true;

// 错误 — 判断方法语义不清
public full(): boolean { ... }
public get lost(): boolean { ... }
```

### 3.3 导出

- 使用**命名导出**，不用 `export default`。
- 一个文件一个主职责，导出的东西应在文件名中有所体现。
- 类型导入统一使用 `import type`，与值导入分开。

```typescript
// 正确
export function build(config: ProjectConfig): Promise<void> { ... }
export function clean(dir: string): Promise<void> { ... }
import type { Filter } from '../../filters/Filter.js';
import { BlurFilter } from '../../filters/BlurFilter.js';

// 错误
export default class Compiler { ... }
import { type Filter, BlurFilter } from '../../filters/Filter.js';
```

### 3.4 可选属性与 `undefined` 类型

**原则：优先使用 `?`，仅在语义必要时才用 `| undefined`。**

#### 类/接口属性

- **默认用 `?`** → `prop?: T`（简洁、语义清晰）
- **仅在属性始终存在但值可能未准备好时** → `prop: T | undefined`（如 mutable cache 模式）
- **不写 `= undefined` 初始值**，TypeScript 会自动初始化为 `undefined`

```typescript
// 正确 — 默认用 ?
class Renderer {
	_currentBuffer?: WebGLRenderBuffer;
	_defaultEmptyTexture?: WebGLTexture;
	activeFilter?: Filter;
}

// 正确 — 仅 mutable cache 模式用 | undefined（属性始终存在，初始为空，后续赋值）
interface TextCache {
	texture: WebGLTexture | undefined;
	textureWidth: number;
}

// 错误 — 能用 ? 却用了 | undefined
class Renderer {
	_currentBuffer: WebGLRenderBuffer | undefined; // 应改为 ?
	_defaultEmptyTexture: WebGLTexture | undefined; // 应改为 ?
}

// 错误 — 禁止写 = undefined
class Foo {
	_texture: WebGLTexture | undefined = undefined; // 多余
}
```

#### 函数参数

- 调用者可以省略整个参数位置时，使用 `param?: T`。
- 调用者必须传递该参数位置、但值允许为空时，使用 `param: T | undefined`。
- `?` 参数通常位于参数列表末尾；不为追求 `?` 而调整具有明确语义的参数顺序。

```typescript
// 正确
function drawTexture(smoothing?: boolean): void { ... }
function deleteTexture(gl: GL | undefined, texture: WebGLTexture | undefined): void { ... }

// 错误 — 本应允许省略的末位参数
function drawTexture(smoothing: boolean | undefined): void { ... }
```

### 3.5 控制流大括号

`if` / `else` / `for` / `while` 的代码块**必须**加大括号，唯一的例外是**提前退出守卫**：

- 允许：`if (!condition) return;` — 单行提前退出，可省略大括号
- 允许：`if (!condition) throw new Error();` — 单行抛出异常
- 允许：`if (!condition) continue;` — 单行跳过
- 不允许：其他所有情况必须加大括号

```typescript
// 正确 — 提前退出守卫：允许单行省略大括号（意图明确，减少视觉噪音）
if (!texture) return;
if (this.contextLost) return;
if (!this._currentBuffer) return;

// 正确 — 正常逻辑：必须加大括号
if (value < 0) {
	value += Math.PI * 2;
}

if (anticlockwise) {
	this.arcBounds(x, y, radius, endAngle, startAngle);
} else {
	this.arcBounds(x, y, radius, startAngle, endAngle);
}

// 错误 — 非提前退出不能省略大括号
if (value < 0) value += Math.PI * 2;
if (anticlockwise) this.arcBounds(x, y, radius, endAngle, startAngle);
```

### 3.6 switch 语句

- 每个 `case` / `default` 必须**以终止语句结尾**（`break` / `return` / `throw`）。
- `default` 分支也必须加 `break`（保持一致性与可维护性）。
- 空的 fall-through `case` 必须加 `// falls through` 注释。

```typescript
// 正确
switch (cmd.type) {
	case DrawCmdType.TEXTURE:
		this._drawTextureBatch(cmd.texture!);
		break;
	case DrawCmdType.RECT:
		this._drawRectBatch(cmd.count);
		break;
	default:
		this._drawTextureBatch(cmd.texture!);
		break;
}

// 错误 — default 没有 break
switch (value) {
	case 'source-over':
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		break;
	default:
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
}
```

### 3.7 注释

- 注释用于表达类型、命名和代码结构无法清楚表达的契约或约束，不复述代码行为。
- 导出 API 在存在非显然语义时应使用 JSDoc，包括：
  - 导出的 class、interface、type、function 和 enum；
  - 导出 class 的 public 属性、getter/setter 和方法；
  - interface 的属性；
  - 参数单位、取值范围、`undefined` 的含义、副作用、生命周期和调用顺序。
- 简单、自解释的公开成员不强制添加 JSDoc。
- private、protected 和 internal 成员默认不写 JSDoc；仅当存在无法通过代码表达的重要不变量时例外。
- 不写历史来源、迁移对比、实现步骤或代码行为复述。
- JSDoc 统一使用**多行格式**，即使只有一行内容。
- `// ── Section ──` 成员分区、lint/tool 指令以及必要的 fall-through 标记不受 JSDoc 格式限制。

```typescript
// 正确 — 类型无法表达单位、范围和副作用
/**
 * Raster resolution multiplier.
 * Values above 1 improve sharpness but increase memory usage.
 */
resolution?: number;

/**
 * Texture displayed by this bitmap.
 * Assign undefined to remove the current texture.
 */
public texture: Texture | undefined;

// 正确 — 简单且自解释，无需 JSDoc
public visible = true;

// 错误 — 复述代码
// Increment the index.
index++;

// 错误 — 单行 /** */ 格式
/** Raster resolution multiplier. */
resolution?: number;
```

- 禁止 `// TODO` / `// FIXME` 混在代码中，用 Issue 跟踪。

### 3.8 类型导入

- 类型导入统一使用顶部 `import type`，禁止在类型位置使用动态导入语法：

```typescript
// 正确 — 顶部静态 import type
import type { State } from '../states/State.js';

states: State[] = [];

// 错误 — 动态导入类型
states: import('../states/State.js').State[] = [];
```

## 4. 类的组织

### 4.1 成员排列顺序

类成员必须按以下顺序排列，各组之间用 `// ── 分组标题 ──` 注释分隔：

```
1. Static fields          （静态字段）
2. Static methods         （静态方法）
3. Instance fields        （实例字段：public → protected → private）
4. Constructor            （构造函数）
5. Getters / Setters      （访问器）
6. Public methods         （公开方法）
7. Override methods       （重写方法）
8. Protected methods      （供子类扩展的方法）
9. Internal methods       （包内/框架方法）
10. Private methods       （私有方法）
```

不存在的分区不写空分区注释。只有一个简单成员分区的小类不强制写分区注释。

```typescript
export class Bitmap extends DisplayObject {
	// ── Static fields ─────────────────────────────────────────
	public static readonly MAX_TEXTURES = 8;
	private static readonly _pool: TextInstruction[] = [];

	// ── Instance fields ───────────────────────────────────────
	public readonly slots: (WebGLTexture | undefined)[] = [];
	private _slotCount = 0;

	// ── Constructor ───────────────────────────────────────────
	public constructor(value?: Texture) { ... }

	// ── Getters / Setters ─────────────────────────────────────
	public get texture(): Texture | undefined { ... }
	public set texture(value: Texture | undefined) { ... }

	// ── Public methods ────────────────────────────────────────
	public getOrAssignSlot(texture: WebGLTexture): number { ... }
	public isFull(): boolean { ... }

	// ── Private methods ───────────────────────────────────────
	private setTexture(value: Texture | undefined): void { ... }
}
```

### 4.2 访问修饰符

- 始终显式写 `public` / `private` / `protected`，不依赖默认值。
- `readonly` 用于**构造后不变**的字段：
    - 正确：`public readonly gl: WebGLRenderingContext`
    - 正确：`public static readonly MAX_TEXTURES = 8`
    - 错误：`private _slotCount`（会变化，不加 `readonly`）
- 能用 `private` 就不用 `protected`，除非明确需要子类访问。

### 4.3 Getter / Setter 规范

- Getter 和 Setter **紧邻放置**，中间不插入其他成员。
- Getter 不应产生可观察副作用；昂贵计算应缓存或改为方法。
- Setter 默认先做**相等性检查**避免无意义的 dirty 标记；当“重新赋值”本身具有失效或刷新语义时可以省略。

```typescript
// 正确
public get smoothing(): boolean {
	return this._smoothing;
}
public set smoothing(value: boolean) {
	if (value === this._smoothing) {
		return;
	}
	this._smoothing = value;
	this.markDirty();
}
```

### 4.4 静态工厂优于构造函数重载

当创建对象有多种语义时，用命名静态工厂方法而非构造函数重载。新建实例优先使用 `create` / `make` / `from`；对象池取用可使用 `alloc`，单例访问可使用 `getInstance`：

```typescript
// 正确
public static create(canvas: HTMLCanvasElement): WebGLRenderContext { ... }
public static alloc(tf: TextField, ox: number, oy: number): TextInstruction { ... }

// 错误
constructor(canvas: HTMLCanvasElement, shared?: boolean) { ... }
```

## 5. 架构原则

### 5.1 单一职责

一个模块只做一件事：

| 模块               | 职责            |
| ------------------ | --------------- |
| `compiler.ts`      | TS 编译编排     |
| `exml-compiler.ts` | EXML 解析与转换 |
| `template.ts`      | 模板文件处理    |
| `target.ts`        | 平台适配        |
| `config.ts`        | 配置文件加载    |

禁止"上帝文件"（一个文件做编译+EXML+拷贝+生成 manifest）。

- 新文件原则上不超过 300 行。
- 修改既有大文件时不为满足行数进行无意义拆分；新增独立职责时优先提取模块，并通过专项重构逐步降低体积。
- 不继续加深既有框架基类之上的业务继承链；新的横切能力优先使用组合。

### 5.2 函数式优先

- 无状态转换逻辑优先纯函数。
- 具有对象身份、生命周期、缓存或资源所有权的领域对象使用 class。
- CLI/构建层的配置转换默认不修改传入的 `config` 对象。
- CLI/构建层的文件 I/O 尽量集中在最外层编排。

```typescript
// 正确 — 纯函数
function generateIndexHtml(config: ProjectConfig): string { ... }

// 错误 — 带副作用的类
class IndexHtmlGenerator {
    constructor(private config: ProjectConfig) {}
    generate(): void { /* 直接写文件 */ }
}
```

### 5.3 依赖注入

- CLI/构建层的纯转换逻辑不直接依赖 `fs` / `path`；文件系统交互放在编排层或通过明确接口传入。
- 引擎运行时只在存在多实现、测试替身或资源所有权边界时使用依赖注入，不为形式统一增加抽象层。

### 5.4 错误处理

- 只抛出 `Error` 或其子类，不抛字符串。
- 当调用方需要稳定分类、附加上下文或区分恢复策略时使用自定义错误类；不强制每个错误都定义新类。
- CLI 入口层捕获错误并友好输出。
- 批处理编译流程在能安全继续时收集错误后统一输出；配置无效或继续执行可能产生错误产物时应立即失败。

```typescript
// 正确
export class BuildError extends Error {
	constructor(
		message: string,
		readonly cause?: Error,
	) {
		super(message);
		this.name = 'BuildError';
	}
}

// 错误
throw 'build failed';
```

## 6. 不写兼容性代码

- **只实现文档明确承诺的兼容面**：EXML、EUI API、资源配置等已公开说明的协议可以兼容；不根据 Egret/Pixi 的历史行为推测或添加隐式兼容分支。
- **未列入公开契约的历史行为不做兼容**：新增兼容面必须先更新公开文档和测试。
- **不兼容旧浏览器**：目标 `ES2022`，不生成 ES5 polyfill。
- **不写无依据的平台兼容分支**：仅当公开支持矩阵确实存在平台差异时使用 `process.platform` 或能力检测，不用宽泛 `try/catch` 吞掉未知错误。
- **不新增对已废弃 Node/浏览器 API 的使用**：`new Buffer()` → `Buffer.from()`，`fs.exists()` → `fs.stat()` 等。已发布的引擎 deprecated API 按版本策略保留，不为清除警告直接破坏兼容性。

## 7. 测试

- 新增核心模块或修改可观察行为时必须添加或更新单元测试。纯文档、注释和无行为差异的格式调整不强制新增测试。
- 使用 `vitest`。
- 测试文件命名：`*.test.ts`，默认放在包级 `test/` 目录；测试专用资源放在 `test/fixtures/`。

## 8. 禁止清单

| 禁止                              | 替代            |
| --------------------------------- | --------------- |
| `global` / `globalThis` 赋值      | 模块作用域变量  |
| 新增 `any` 类型                  | `unknown`、具体类型或泛型 |
| `@ts-ignore` / `@ts-expect-error` | 修正类型        |
| 应用层 `null`                     | `undefined`     |
| `export default`                  | 命名导出        |
| `var`                             | `const` / `let` |
| `require()`                       | `import`        |
| 文件内 `console.log`              | 统一 `logger`   |
| `// @ts-nocheck`                  | 删除并修正类型  |
