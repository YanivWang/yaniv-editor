# Changelog

## [Unreleased] — Architecture Refactor

### BREAKING CHANGES

#### 1. `basic` preset 默认能力收紧

`basic` preset 不再默认开启 `table` 和 `video`，重构后仅保留 `image`。

**迁移**：若需保留旧行为，显式传入 features：

```vue
<YanivEditor preset="basic" :features="{ table: true, video: true }" />
```

#### 2. CSS 选择器 `.is-preview` → `[data-phase="preview"]`

`.is-preview` class 已删除，根节点改为声明式 `:data-phase="profile.mode"`。

**迁移**：

```css
/* 旧 */
.is-preview .my-class { ... }

/* 新 */
[data-phase="preview"] .my-class { ... }
```

#### 3. `registerAppearance()` 全局 API 删除

模块级 `registerAppearance(name, vars)` 已删除（违反多实例隔离原则）。

**迁移**（二选一）：

```ts
// 方式 A：通过 expose 的实例方法
const editorRef = ref<YanivEditorExpose | null>(null);
editorRef.value?.appearance.registerCustom("mybrand", {
  "--ye-primary": "#ff00ff",
});

// 方式 B：通过 props（推荐，响应式）
```

```vue
<YanivEditor appearance="custom" :custom-appearance-vars="{ '--ye-primary': '#ff00ff' }" />
```

#### 4. `buildEditorExtensions` / `buildInlineExtensions` / `resolveInlineExtensionGates` 删除

旧的扩展 builder 已删除，统一由 `capabilities/buildExtensions(host, gates, ctx)` 取代。高级集成方如需自定义能力，通过 Capability Registry API 注册。

#### 5. `resolveExtensionGates` / `applyExtensionGatesToToolbarConfig` 删除

能力门控逻辑统一收入 Capability Registry，不再对外暴露独立函数。

**迁移**：

```ts
// 旧
import { applyExtensionGatesToToolbarConfig } from "@yanivjs/yaniv-editor";

// 新
import { applyGatesToToolbarConfig } from "@yanivjs/yaniv-editor";
```

#### 5b. `hasInlineToolbarItems` 删除

Inline 工具栏显隐改由 Registry 推导。

**迁移**：

```ts
// 旧
import { hasInlineToolbarItems } from "@yanivjs/yaniv-editor/inline";

// 新
import { resolveShowInlineToolbar, CAPABILITIES } from "@yanivjs/yaniv-editor/inline";

resolveShowInlineToolbar(toolbar, CAPABILITIES);
```

#### 5c. AI 模块独立入口

AI 功能从主包拆出，按需引入：

```ts
import { AiMenuButton, useAiConfig } from "@yanivjs/yaniv-editor/ai";
```

#### 6. `localeGeneration` 不再 export

旧的 `:key="localeEpoch"` 强制重渲方案已废弃，locale 切换通过 scoped locale + session rebuild 处理。

#### 7. Inline 编辑器 schema 容错行为变更

Inline toolbar 关闭某类格式时，外部传入内容中对应的 mark/node 会在解析时**静默丢弃**（保留文字，丢失格式），而非"保留为 `<p>` 段落"。

**影响**：若宿主依赖 Inline 编辑器保留 Full 编辑器写入的格式（如 table、math），改用 Full 编辑器，或显式开启对应 feature。

#### 8. capability 关闭后对应节点静默丢失

通过 `features` prop 关闭某 capability（如 `{ table: false }`）触发 session rebuild 时，新 schema 不识别对应节点（如 table），**内容中该节点会静默丢失**。这是 by-design 行为。

**影响**：不要在运行时频繁切换 `features` 开关，或自行在切换前备份内容。

#### 9. `outlinePanel.visible` → `outlinePanel.expanded` 重命名

`provideOutlinePanel()` / `useOutlinePanel()` 返回的字段从 `visible` 改名为 `expanded`，语义对齐 chromePolicy 文档。

**默认值不变**：仍为 `true`（outline gate 开启时默认展开大纲）。

**迁移**：

```ts
const { visible } = useOutlinePanel(); // 旧
const { expanded } = useOutlinePanel(); // 新
```

#### 10. `onPhaseChange` 事件新增 `reason` 字段

订阅方收到的 `PhaseChangeEvent` 新增 `reason: 'mode-change' | 'ready'` 字段，且 `from` 字段类型从 `EditorPhase` 改为 `EditorPhase | null`（`reason === 'ready'` 时 `from` 为 `null`）。

**迁移**：

```ts
// 旧
onPhaseChange(({ from, to, editor }) => { ... });

// 新（向前兼容写法）
onPhaseChange(({ from, to, editor, reason }) => {
  if (reason === 'ready') return;            // 跳过 session ready 后的初始同步
  // ... 原逻辑
});
```

#### 11. Shell / 扩展层禁止直接调用 `editor.setEditable`

外部高级集成方若在自定义扩展或封装组件中调用 `editor.setEditable(...)`，需改为：

```ts
// 通过 expose 的实例方法
editorRef.value?.requestPhase("preview");
```

`setEditable` 入口收口至 `useEditorSession.requestPhaseTransition`，保证 buffer / emit 顺序的不变量。

---

### 内部重构（无外部 API 变更，但影响子类化/高级集成）

- Session 层：`useEditorSession` 取代 `initEditor` + `isInitializing` + `isFirstInit` 并发锁
- Phase 切换：`applyPhaseTransition` 规范化为"edit→preview: 先 emit 再 setEditable"顺序；Session 层提供 `requestPhaseTransition(nextPhase)` 入口与 buffer 机制（session loading 期间切换会延后到 rebuild 完成）
- ContentAdapter：所有受控内容写入改用 raw transaction + `BYPASS_GUARD_META`（Symbol），不再使用 `editor.commands.setContent`；新增 `addToHistory` / `source` 选项
- Locale：各编辑器实例独立 locale context，扩展通过 `ctx.locale` 静态快照读取文案
- Appearance：`customAppearances` Map 移入实例作用域，多编辑器实例互不影响
- Outline：scrollParent 改为 late-binding（`editor.commands.bindOutlineScrollParent(el)`），由 Workspace `onMounted` 后注入；解决冷启动时 DOM 未就绪的时序问题
- AI 配置：扩展层全部改为 getter 形式（`getApiKey: () => ctx.aiConfig()?.apiKey`），宿主修改 `aiConfig` 后无需重建 session
- Inline gates：新增 `resolveInlineGates(toolbar, capabilities)` 统一推导，与 Full 的 `profile.features` 路径并存但互不重叠
- Tiptap 版本绑定：要求 `@tiptap/core ≥ 3.0.0`；`withTransactionGuard` 不再依赖 `this.editor`，改通过 `ctx.isEditable` Ref 注入
