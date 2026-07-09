# Changelog

## [Unreleased]

### Fixed

- DragHandle：Editor 构造时 `view.dom` 尚未挂入 `.yaniv-editor` 时不再同步解析 overlay portal，改为延迟挂载；修复切换到 Notion preset（启用 dragHandle）时 session 重建失败。

### Changed

- Z-index：token 作用域限定在 `.yaniv-editor`；新增 `zIndexBase` prop（默认 `1000`）；浮层统一挂载 `.yaniv-editor__overlay-portal`。
- 浮层挂载收口：BubbleMenu / Ant Design Dropdown·Select·Popover·Modal·Tooltip / DragHandle 菜单 / AI Popover / Toast·Notice 全部走 overlay portal；删除 Tippy 兼容层（`useOverlayTippyOptions`）、`document.body` fallback、以及 Ant Design 静态 `message` / `notification`。
- 统一入口：`useOverlayMountTarget` / `useOverlayBubbleMenu`（`src/composables/useOverlayMount.ts`）、`useOverlayFeedback` / `showOverlayToast` / `showOverlayNotice`（`src/core/overlayFeedback.ts`）。
- 删除未使用的 `useYeZIndex`；文档内 tooltip 改用 `--ye-z-chrome-tooltip`，portal 内 Ant Design Tooltip 使用 `--ye-z-tooltip`（`base + 60`），Toast 使用 `--ye-z-toast`（`base + 80`）。

### Docs

- 文档与注释对齐当前实现：`adaptJsonToSchema` 关闭 capability 时提升子内容（非整段静默丢失）；表格上下文条能力与 `TableCellWithBackground` schema/UI 边界；`withTransactionGuard` 命名；basic 下表格工具依赖 `gates.table`。

## [0.1.2] — 2026-07-06

### Fixed

- Ant Design Vue 组件改为在各 UI 组件内局部 import（`src/shared/antd.ts`），宿主应用**无需** `app.use(Antd)` 或 Nuxt 额外全局注册即可使用 `<YanivEditor>`。

## [0.1.1] — 2026-05-23

### Changed

- 大纲面板默认**收起**（`provideOutlinePanel` 默认 `expanded=false`）。如需初始展开，传入 `:default-outline-expanded="true"`。

### Fixed

- Inline Editor：`placeholder`、`extraExtensions` 变化现在会正确更新 `sessionKey` 并触发 session 重建（此前修改可能不生效）。
- 多实例场景下 `aiConfig` 卸载时不再误清其他编辑器实例的配置（`hostConfig` owner 隔离）。
- 块菜单「标注框 / Callout」改为包裹当前块，而非仅 toggle 空标注。
- 媒体上传 URL 经 `safeUrl` 规范化，过滤不安全协议。

## [0.1.0] — 2026-05-22

Architecture Refactor（Session / Runtime / Capability Registry 分层重构）

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

模块级 `registerAppearance(name, vars)` 已删除（违反多实例隔离原则）。`YanivEditorExpose` **不**暴露 appearance 实例方法；宿主通过 props 注入自定义外观变量。

**迁移**：

```vue
<YanivEditor appearance="custom" :custom-appearance-vars="{ '--ye-primary': '#ff00ff' }" />
```

#### 4. `buildEditorExtensions` / `buildInlineExtensions` / `resolveInlineExtensionGates` 删除

旧的扩展 builder 已删除，统一由 `capabilities/buildExtensions(host, ctx)` 取代（`gates` 在 `ctx.gates` 内）。高级集成方如需自定义能力，通过 Capability Registry API 注册。

#### 5. `resolveExtensionGates` / `isFeatureEnabled` / `applyExtensionGatesToToolbarConfig` 删除

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

主入口不再 `export * from "./features/ai"`。

#### 6. `localeGeneration` 不再 export

旧的 `:key="localeEpoch"` 强制重渲方案已废弃；`localeGeneration` 为 `locales/manager.ts` 模块内部实现。locale 切换通过 scoped locale + session rebuild 处理。

#### 7. Inline 编辑器 schema 容错行为变更

Inline toolbar 关闭某类格式时，外部传入内容中对应的 mark/node 会在解析时**静默丢弃**（保留文字，丢失格式），而非"保留为 `<p>` 段落"。

**影响**：若宿主依赖 Inline 编辑器保留 Full 编辑器写入的格式（如 table、math），改用 Full 编辑器，或显式开启对应 toolbar slug。

#### 8. capability 关闭后未知节点结构被剥离（子内容提升）

通过 `features` prop 关闭某 capability（如 `{ table: false }`）触发 session rebuild 时，新 schema 不识别对应节点（如 `table` / `tableRow` / `tableCell`）。JSON 快照会经 `ContentAdapter.adaptJsonToSchema` **剥离未知节点结构并提升子内容**（例如单元格内文本保留为段落），而不是整段内容消失。这是 by-design 行为。

**影响**：不要在运行时频繁切换 `features` 开关；切换后表格等结构会丢失，仅保留可提升的文本/合法后代。若需完整结构，请自行在切换前备份内容。

#### 9. `outlinePanel.visible` → `outlinePanel.expanded` 重命名

`provideOutlinePanel()` / `useOutlinePanel()` 返回的字段从 `visible` 改名为 `expanded`，语义对齐 chromePolicy 文档。

**v0.1.0 发布时**默认仍为 `true`；**v0.1.1 起**默认改为 `false`。恢复旧默认展开行为：

```vue
<YanivEditor preset="full" :default-outline-expanded="true" />
```

**迁移（字段重命名）**：

```ts
const { visible } = useOutlinePanel(); // 旧
const { expanded } = useOutlinePanel(); // 新
```

#### 10. `PhaseChangeEvent` 新增 `reason` 字段；`from` 可为 `null`

`useEditorSession` 派发的 `PhaseChangeEvent` 新增 `reason: 'mode-change' | 'ready'`，且 `from` 类型改为 `EditorPhase | null`（`reason === 'ready'` 时为 `null`）。

> **说明**：`onPhaseChange` 由 Session 层（`useEditorSession`）提供，**未**挂到 `YanivEditor` / `YanivInlineEditor` 的组件 expose。宿主切换 edit/preview 请使用 `:mode` prop；仅在 fork 库内 Session 集成或高级封装时订阅此回调。

**迁移**（Session 层订阅方）：

```ts
onPhaseChange(({ from, to, editor, reason }) => {
  if (reason === "ready") return; // 跳过 session rebuild 后的初始同步
  // ... 原逻辑；from 可能为 null
});
```

#### 11. 禁止直接调用 `editor.setEditable`；宿主用 `:mode` prop 切换 phase

Shell 与扩展层禁止直接调 `editor.setEditable`；入口收口至 `useEditorSession.requestPhaseTransition`。`YanivEditorExpose` **不**暴露 `requestPhase` / `getPhase`。

**迁移**（宿主业务代码）：

```vue
<!-- 旧：editorRef.value?.getEditor()?.setEditable(false) -->
<YanivEditor :mode="previewMode ? 'preview' : 'edit'" />
```

自定义扩展内若需感知 phase，通过 `ctx.isEditable`（`BuildExtensionsCtx`）或 `filterTransaction` 守卫，**不要**直接 `setEditable`。

#### 12. 内置 appearance `github` / `typora` 移除

内置视觉皮肤收敛为 `default | word | notion | custom`，`appearance="github"` 与 `appearance="typora"` 不再可用。

**迁移**：若仍需类似风格，使用 `appearance="custom"` 并通过 `:custom-appearance-vars` 覆盖 `--ye-*` token（可参考 git 历史中已删除的 CSS 变量定义）。

```vue
<YanivEditor
  appearance="custom"
  :custom-appearance-vars="{
    '--ye-primary': '#0969da',
    '--ye-bg': '#ffffff',
  }"
/>
```

---

### 新增导出（`@yanivjs/yaniv-editor` 主入口）

| 符号                        | 说明                                                    |
| --------------------------- | ------------------------------------------------------- |
| `EditorRuntimeProfile`      | Runtime 配置快照类型                                    |
| `ResolvedChromePolicy`      | Chrome 显隐策略（Full / Inline discriminated union）    |
| `SessionStatus`             | Session 状态：`idle` \| `loading` \| `ready` \| `error` |
| `EditorShellHost`           | `'full'` \| `'inline'`                                  |
| `EditorPhase`               | `'edit'` \| `'preview'`                                 |
| `ExtensionGates`            | 能力门控对象                                            |
| `PhaseChangeEvent`          | Phase 切换事件类型                                      |
| `CapabilityDefinition`      | Registry 能力定义类型                                   |
| `BuildExtensionsCtx`        | 扩展构建上下文类型                                      |
| `resolveEditorProfile`      | Preset + features → profile                             |
| `mergeFeatures`             | Overrides 合并（undefined 不覆盖）                      |
| `resolveChromePolicy`       | profile + layout + gates → chromePolicy                 |
| `computeSessionKey`         | Session 重建 key                                        |
| `resolveInlineGates`        | Inline toolbar → gates                                  |
| `buildExtensions`           | 统一扩展 builder                                        |
| `BYPASS_GUARD_META`         | ContentAdapter 绕过守卫 meta（Symbol）                  |
| `CAPABILITIES`              | 能力 Registry 常量                                      |
| `applyGatesToToolbarConfig` | Full 工具栏 gate 过滤                                   |
| `resolveShowInlineToolbar`  | Inline 工具栏是否展示                                   |
| `ContentAdapter`            | 受控内容 raw dispatch                                   |
| `applyPhaseTransition`      | Phase 切换顺序规范化                                    |

`@yanivjs/yaniv-editor/inline` 额外导出：`CAPABILITIES`（与主入口同源，供 `resolveShowInlineToolbar(toolbar, CAPABILITIES)` 使用）。

---

### 内部重构（无宿主-facing API 变更，但影响 fork / 高级集成）

- Session 层：`useEditorSession` 取代 `initEditor` + `isInitializing` + `isFirstInit` 并发锁
- Phase 切换：`applyPhaseTransition` 规范化为"edit→preview: 先 emit 再 setEditable"顺序；Session 层提供 `requestPhaseTransition(nextPhase)` 入口与 buffer 机制（session loading 期间切换会延后到 rebuild 完成）
- ContentAdapter：所有受控内容写入改用 raw transaction + `BYPASS_GUARD_META`（Symbol），不再使用 `editor.commands.setContent`；新增 `addToHistory` / `source` 选项
- Locale：各编辑器实例独立 locale context，扩展通过 `ctx.locale` 静态快照读取文案
- Appearance：`customAppearances` Map 移入 `useEditorAppearance` 实例作用域，多编辑器实例互不影响
- Outline：scrollParent 改为 late-binding（`editor.commands.bindOutlineScrollParent(el)`），由 Workspace `onMounted` 后注入
- AI 配置：扩展层全部改为 getter 形式（`getApiKey: () => ctx.aiConfig()?.apiKey`），宿主修改 `aiConfig` 后无需重建 session
- Inline gates：`resolveInlineGates(toolbar, capabilities)` 为 Inline gates 唯一来源；Full gates 仅由 `profile.features` 推导
- CSS 分层：ProseMirror 正文结构收敛至 `content.css` / `table.css` / `code-block.css`；appearance 仅改 token 与排版；Notion 块 hover 独立为 `block-hover.css`（`.appearance-notion` 限定）
- Tiptap 版本绑定：要求 `@tiptap/core ≥ 3.0.0`；`withTransactionGuard` 位于 `capabilities/transactionGuard.ts`，通过 `ctx.isEditable` Ref 注入
