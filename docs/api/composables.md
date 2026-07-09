# Composables

公共 composables 和高级运行时辅助函数从根包导出。

## 编辑器上下文

```ts
import { provideYanivEditor, useYanivEditor } from "@yanivjs/yaniv-editor";
```

自定义工具组件需要访问当前编辑器实例时使用。编辑器根节点与 overlay portal 由 `EditorShell` 内部 `provideEditorRoot` / `provideOverlayPortal` 注入；自定义 Shell 须自行提供，见 [Z-Index 与浮层](../guide/z-index.md)。

## 视觉上下文

```ts
import {
  loadAppearance,
  preloadAppearances,
  applyCustomAppearanceToElement,
  applyAppearanceToElement,
  resolveColorMode,
  useResolvedColorMode,
  watchSystemColorMode,
  editorAppearanceInjectionKey,
  useInjectEditorAppearance,
} from "@yanivjs/yaniv-editor";
```

`YanivEditor` 通过 `appearance`、`colorMode` 和可选的 `customAppearanceVars` 驱动视觉状态。z-index 请使用 `zIndexBase` prop，不要用 `customAppearanceVars` 覆盖 `--ye-z-base`。

## 气泡菜单辅助

```ts
import {
  isBubbleMenuBlocked,
  shouldShowFloatingTextToolbar,
  shouldShowImageBubbleMenu,
  shouldShowLinkBubbleMenu,
  shouldShowTableBubbleMenu,
  shouldShowVideoBubbleMenu,
  scrollEditorSelectionIntoView,
} from "@yanivjs/yaniv-editor";
```

## 编辑器状态辅助

```ts
import { useEditorColorState, useFindReplaceHotkey } from "@yanivjs/yaniv-editor";
```

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
  applyPhaseTransition,
} from "@yanivjs/yaniv-editor";
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
} from "@yanivjs/yaniv-editor";
```

## AI 子包

AI 扩展和 UI 从 `@yanivjs/yaniv-editor/ai` 导出，不在根包中：

```ts
import { ContinueWritingExtension, AiMenuButton, useAiConfig } from "@yanivjs/yaniv-editor/ai";
```
