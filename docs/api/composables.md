# Composables

公共 composables 和高级运行时辅助函数从根包导出。

## 编辑器上下文

```ts
import { provideYanivEditor, useYanivEditor } from "@yanivjs/yaniv-editor";
```

自定义工具组件需要访问当前编辑器实例时使用。

编辑器根节点与 overlay portal 由 `EditorShell` 内部的 `provideEditorRoot` / `provideOverlayPortal` 注入。**这两个函数以及 `useEditorRoot` / `useOverlayPortal` / `getYeZIndex` 目前不在包的公共导出里**（只存在于 `src/core/editorContext.ts` 与 `src/utils/zIndex.ts`），因此完全自建 Shell 需要 fork 仓库；基于 `YanivEditor` / `YanivInlineEditor` 之上做自定义工具组件则不受影响。相关约定见 [Z-Index 与浮层](../guide/z-index.md)。

## 视觉上下文

```ts
import {
  loadAppearance,
  preloadAppearances,
  isLoadableAppearance,
  applyCustomAppearanceToElement,
  applyAppearanceToElement,
  getAppearanceClassName,
  resolveColorMode,
  useResolvedColorMode,
  watchSystemColorMode,
  useEditorAppearance,
  editorAppearanceInjectionKey,
  useInjectEditorAppearance,
  EDITOR_APPEARANCES,
} from "@yanivjs/yaniv-editor";
```

`EDITOR_APPEARANCES` 只列出有 CSS 文件的三种外观（`default` / `notion` / `word`），不含 `custom`。

`YanivEditor` 通过 `appearance`、`colorMode` 和可选的 `customAppearanceVars` 驱动视觉状态。z-index 请使用 `zIndexBase` prop，不要用 `customAppearanceVars` 覆盖 `--ye-z-base`。

## 气泡菜单辅助

```ts
import {
  isBubbleMenuBlocked,
  findLinkHrefInSelection,
  shouldShowFloatingTextToolbar,
  shouldShowImageBubbleMenu,
  shouldShowLinkBubbleMenu,
  shouldShowTableBubbleMenu,
  shouldShowVideoBubbleMenu,
  scrollEditorSelectionIntoView,
} from "@yanivjs/yaniv-editor";
```

## 浮层挂载与反馈

```ts
import {
  useOverlayMountTarget,
  useOverlayBubbleMenu,
  useOverlayFeedback,
} from "@yanivjs/yaniv-editor";
```

- `useOverlayMountTarget` / `useOverlayBubbleMenu`：Ant Design / BubbleMenu 挂载到 overlay portal。
- `useOverlayFeedback`：Toast / Notice（替代 antd 静态 `message` / `notification`）。

详见 [Z-Index 与浮层](../guide/z-index.md)。

## 编辑器状态辅助

```ts
import { useEditorColorState, useFindReplaceHotkey } from "@yanivjs/yaniv-editor";
```

`useFindReplaceHotkey({ enabled, onOpen, target? })` 在**编辑器根节点**上监听 `keydown`，而不是全局 document：

- 快捷键按实例隔离，同页多个编辑器互不串扰；
- 焦点在编辑器之外时不拦截 Ctrl/Cmd+F，留给浏览器原生查找；
- 默认从 `EditorShell` inject 根节点，自建 shell 可显式传 `target: Ref<HTMLElement | null>`。

## 运行时与能力

高级集成可组合与内置组件相同的运行时管线：

```ts
import {
  resolveEditorProfile,
  mergeFeatures,
  resolveChromePolicy,
  computeSessionKey,
  resolveInlineGates,
  buildExtensions,
  CAPABILITIES,
  applyGatesToToolbarConfig,
  resolveShowInlineToolbar,
  ContentAdapter,
  adaptJsonToSchema,
  parseContentToDoc,
  prepareEditorContent,
  applyPhaseTransition,
  BYPASS_GUARD_META,
} from "@yanivjs/yaniv-editor";
```

- `ContentAdapter` / `adaptJsonToSchema` / `prepareEditorContent`：跨 schema 写入时清洗未知节点与 mark（session rebuild、受控 JSON）。
- `parseContentToDoc(content, schema)`：把 HTML 或 JSON 解析成合法的 ProseMirror doc，解析失败回退空段落。
- `BYPASS_GUARD_META`：打在事务 meta 上以绕过 `withTransactionGuard`；`ContentAdapter.setContent` 内部已自动打上。

## 无障碍

```ts
import { useRovingTabindex } from "@yanivjs/yaniv-editor";
```

| Composable             | 用途                                                                                              | 是否导出             |
| ---------------------- | ------------------------------------------------------------------------------------------------- | -------------------- |
| `useRovingTabindex`    | 把一个容器收敛为 WAI-ARIA APG 的单一 tab stop，内部用方向键 / Home / End 移动                     | ✅                   |
| `useVirtualFocusPopup` | 焦点留在正文的弹层：把 `aria-expanded` / `aria-controls` / `aria-activedescendant` 挂到编辑器正文 | ❌ 仅库内（需 fork） |

`useRovingTabindex(containerRef)` 会用 `MutationObserver` 重扫容器——按需加载的工具按钮在首帧尚未挂载。输入型控件（`input` / `textarea` / `contenteditable` / `role="combobox"`）内的方向键不劫持，带修饰键的方向键也不拦截。

`useVirtualFocusPopup` 目前只服务库内的 `BlockPickerMenu` / `MentionSuggestionMenu`，**没有**从包里导出（只存在于 `src/composables/useVirtualFocusPopup.ts`）。

自建工具栏时可直接复用：

```ts
const toolbarRef = ref<HTMLElement | null>(null);
useRovingTabindex(toolbarRef);
```

## 国际化

```ts
import {
  createI18n,
  useI18n,
  t,
  loadLocale,
  normalizeLocaleCode,
  ensureLocalesLoaded,
  BUILTIN_LOCALE_CODES,
} from "@yanivjs/yaniv-editor";
```

全局 `t()` / `createI18n()` 走的是 `locales/manager.ts` 的模块级 `currentLocale`，**仅供非组件/兜底场景**。编辑器内部的 chrome 组件读的是 `provideEditorLocale` 注入的实例 locale，因此对同页多实例，改全局 locale 不会影响已挂载的编辑器 —— 请用 `locale` prop。

## AI 子包

AI 扩展和 UI 从 `@yanivjs/yaniv-editor/ai` 导出，不在根包中：

```ts
import { ContinueWritingExtension, AiMenuButton, useAiConfig } from "@yanivjs/yaniv-editor/ai";
```
