# Changelog

## [Unreleased]

### Fixed

- **AI 配置回退链失效**：registry 的 `getProvider` 兜底为 `"openai"`，使 `client.ts` 的 `getAiConfig()` 恒判定"宿主已托管"，localStorage（AI 设置弹窗）与 `VITE_AI_*` 两级回退永远走不到。改为各 getter 只透传宿主原值，缺省值统一在 `getAiConfig()` 补齐；`resolveAiExtensionOptions` 无 provider 时返回 `null`。同时统一 timeout 默认值为 60s，并让 `storageMode: "proxy"` 在无 apiKey 时也判定为已配置。
- **notion preset 下大纲与查找替换不可达**：两项 gate 默认开启但 UI 只挂在顶栏，而 notion 隐藏顶栏。现在大纲面板不再耦合 `toolbarConfig.outline`，收起时在 rail 渲染展开把手；查找面板与 Ctrl/Cmd+F 拆分到 `FindReplaceDialog`（挂 `EditorEditChrome`，只看 `gates.searchReplace`），顶栏按钮退化为纯触发入口。
- **移动端工具栏绕过 gate 过滤**：`ToolbarNav` 在 ≤768px 时把 `COMPACT_TOOLBAR_CONFIG` spread 覆盖到已过滤的配置上，使 COMPACT 中硬编码为 `true` 的 `image` / `ai` 重新出现（`preset="basic"` 窄屏下会渲染无扩展支撑的 AI 按钮）。改为取交集的掩码合并。
- **outline `scrollParent` late-binding 断链**：`bindOutlineScrollParent` command 写模块级单例，而 registry 的 getter 读 `ctx.outline`，两者互不相通导致 `TableOfContents` 恒回退 `window`；模块级存储还会让同页多实例互相覆盖。改为 `createOutlineScrollParentBinder(ctx.outline.bindScrollParent)`，写回实例作用域。
- **phase 切换不清理扩展状态**：`SearchReplace` / `FormatPainter` 现在各自在 plugin `view.update` 中检测 `view.editable` 由 true 变 false 并自清（搜索词与命中高亮、格式刷激活态与光标样式），不再依赖顶栏卸载这一副作用。
- **实例 locale 非响应式**：`provideEditorLocale` 的 `messagesRef` 是普通对象，语言包异步加载完成后不触发重渲，先渲染的组件会永久显示原始 key（如 `editor.outlineToggle`）。改为 `shallowRef`。
- **Ctrl/Cmd+F 快捷键是全局的**：`useFindReplaceHotkey` 用 hotkeys-js 注册全局快捷键，同页多实例下按一次会同时弹出多个查找面板；`hotkeys.unbind("ctrl+f,command+f")` 解绑的是全部 handler，一个实例卸载会废掉其他实例；`hotkeys.filter = () => true` 的全局覆盖还会影响宿主自己用 hotkeys-js 注册的快捷键。改为在编辑器根节点监听 `keydown`：天然按实例隔离，且焦点在编辑器之外时不再劫持浏览器原生查找。
- **`FooterNav` 缩放条位置 prop 名不匹配**：`EditorStatusChrome` 传 `:zoom-bar-placement`，组件声明的是 `placement`，导致 `presetLayout.zoomPlacement` 是死配置。同时删除从未被读取的 `editor` prop。

### Removed

- **peer dependency `hotkeys-js`**：查找快捷键改为原生 `keydown` 监听后已无引用，接入方可少装一个包。若宿主自身用到 hotkeys-js，请自行加入依赖。

### Changed

- `SearchReplace` / `FormatPainter` 的自清逻辑补上 `editor.isDestroyed` 前置判断（destroy 后访问 `editor.view` 会抛错），并新增 `phaseSelfCleanup.test.ts` 锁住自清行为与"清理只产生一次 dispatch"。
- `useFindReplaceHotkey` 新增可选 `target` 参数（默认取 `EditorShell` 根节点），自建 shell 可显式指定监听容器。
- i18n 覆盖补齐：图片 / 视频上下文条按钮、拖拽手柄 `aria-label`、session 骨架与错误态文案改为走实例 locale，新增 `editor.mediaPreview` / `imageDelete` / `videoDelete` / `dragHandleAddBlock` / `dragHandleOpenMenu` / `sessionLoading` / `sessionRetry` / `sessionInitFailed`。
- `editorConstants.ts` 中 `TEXT_ALIGN_OPTIONS` / `EDITOR_LIMITS` / `KEYBOARD_SHORTCUTS` 标记为 `@deprecated`（无运行时引用，真实值分别在 `AlignDropdown` 的 i18n key、`ZoomBar` props 默认值与各扩展的 `addKeyboardShortcuts()`）。

### Docs

- 全量校对文档与源码，补全 `update` / `update:content` 事件与 Inline `#toolbar` 插槽的 API 文档；修正 preset 能力描述、inline 工具栏扩展对照表、`buildExtensions` 示例参数、代码块语言数量、浮动菜单触发条件等。
- 说明 `createI18n({ messages })` 不影响编辑器文案（自定义文案只被全局 `t()` 读取），并列出仍为中文的占位内容。

## [0.1.4] — 2026-07-09

### Fixed

- `tsconfig.json`：移除 `baseUrl`，`paths` 改为 `./` 相对写法，修复部分工具链下路径别名解析异常。

### Changed

- 清理 `contentAdapter.ts` 中未使用的 `EMPTY_DOC` 常量；统一 `isVisuallyEmpty.test.ts` 的 import 格式。

## [0.1.3] — 2026-07-09

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
