# 代码规则

所有贡献者必须遵守以下规则。PR 不符合规则将被要求修改。

---

## 1. 语言与运行时

- **TypeScript only**，所有 `.ts` 文件，禁止 `.js` 业务代码。
- 目标 `ES2022`，模块系统 `ESM`（`"type": "module"`）。
- 使用 `Node.js >= 20` API，不写向下兼容代码。
- 使用 `pnpm` 作为包管理器。

## 2. 类型系统

### 2.1 严格模式

`tsconfig.json` 必须 `"strict": true`，不得通过 `as any` / `@ts-ignore` 绕过。

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

遵循 `.prettierrc`，提交前 `pnpm format`。

### 3.2 命名

| 场景                                    | 风格                                 | 示例                                        |
| --------------------------------------- | ------------------------------------ | ------------------------------------------- |
| 文件名                                  | `kebab-case`                         | `exml-compiler.ts`                          |
| class / interface / type / enum         | `PascalCase`                         | `ProjectConfig`, `BitmapFillMode`           |
| `const enum`（枚举类型名）              | `PascalCase`                         | `DrawCmdType`                               |
| 函数 / 方法 / 变量                      | `camelCase`                          | `buildProject`, `getOrAssignSlot`           |
| 全局常量（`static readonly` / `const`） | `UPPER_SNAKE_CASE`                   | `MAX_TEXTURES`, `DEFAULT_WIDTH`             |
| 私有实例字段                            | `_camelCase`（下划线前缀）           | `_config`, `_slotCount`                     |
| 布尔变量/属性                           | `is` / `has` / `should` / `can` 前缀 | `isFull()`, `hasEui`, `contextLost`         |
| 事件回调                                | `on` / `handle` 前缀                 | `onResize`, `handleClick`                   |
| 工厂函数（创建并返回对象）              | `make` / `create` 前缀               | `makeMultiCmd`, `makeCmd`                   |
| 类型参数（泛型）                        | 单大写字母或 `T` 前缀                | `T`, `TValue`, `TResult`                    |
| 接口（仅用作类型标注）                  | 不加 `I` 前缀                        | `TextCache`, `DrawCmd`（不是 `ITextCache`） |

```typescript
// 正确 — 常量命名
public static readonly MAX_TEXTURES = 8;
private static readonly _pool: TextInstruction[] = [];

// 正确 — 布尔命名
public isFull(): boolean { ... }
public get contextLost(): boolean { ... }

// 错误 — 布尔命名
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

- 可选参数用 `?`，不写 `| undefined`：
- 可选参数必须放在参数列表末尾。

```typescript
// 正确
function drawTexture(smoothing?: boolean): void { ... }

// 错误
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

- **不写注释**，除非代码本身无法表达意图。
- 需要注释时，用 JSDoc 格式，只对**导出 API** 写。
- JSDoc 注释统一使用**多行格式**，即使只有一行内容：

```typescript
// 正确 — 多行格式
/**
 * The name of this state.
 */
name: string;

/**
 * Force immediate validation of all components at or below target's depth.
 */
validateClient(target: ValidatorClient): void { ... }

// 错误 — 单行 /** */ 格式
/** The name of this state. */
name: string;

/** Force immediate validation of all components at or below target's depth. */
validateClient(target: ValidatorClient): void { ... }
```

- 类属性不写注释。
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
2. Instance fields        （实例字段：public → private）
3. Constructor            （构造函数）
4. Getters / Setters      （访问器）
5. Public methods         （公开方法）
6. Override methods       （重写方法）
7. Private methods        （私有方法）
```

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
- Getter 中不做复杂计算，复杂逻辑抽到私有方法。
- Setter 中做**相等性检查**避免无意义的 dirty 标记：

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

当创建对象有多种方式时，用静态工厂方法而非构造函数重载：

```typescript
// 正确
public static getInstance(canvas: HTMLCanvasElement): WebGLRenderContext { ... }
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

### 5.2 函数式优先

- 纯函数 > 类方法。
- 数据不可变：传入的 `config` 对象不得被修改。
- 副作用隔离：文件 I/O 集中在最外层调用。

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

- 核心逻辑不依赖 `fs` / `path` 等具体实现，通过参数传入。
- 便于测试时可 mock 文件系统。

### 5.4 错误处理

- 抛出自定义错误类，不抛字符串。
- CLI 入口层捕获错误并友好输出。
- 编译错误收集后统一输出，不中途退出。

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

- **不兼容旧版 Egret**：配置文件格式、API、CLI 参数全部重新设计。
- **不兼容旧浏览器**：目标 `ES2022`，不生成 ES5 polyfill。
- **不写平台检测兼容**：`process.platform` 直接用，不包 `try/catch`。
- **不用 deprecated API**：`new Buffer()` → `Buffer.from()`，`fs.exists()` → `fs.stat()` 等。

## 7. 测试

- 每个核心模块必须有单元测试。
- 使用 `vitest`。
- 测试文件命名：`*.test.ts`，放在对应模块同级。

## 8. 禁止清单

| 禁止                              | 替代            |
| --------------------------------- | --------------- |
| `global` / `globalThis` 赋值      | 模块作用域变量  |
| `any` 类型                        | 具体类型或泛型  |
| `@ts-ignore` / `@ts-expect-error` | 修正类型        |
| `null`                            | `undefined`     |
| `export default`                  | 命名导出        |
| `var`                             | `const` / `let` |
| `require()`                       | `import`        |
| 类继承链 > 2 层                   | 组合 / 函数     |
| 文件内 `console.log`              | 统一 `logger`   |
| `// @ts-nocheck`                  | 删除并修正类型  |
