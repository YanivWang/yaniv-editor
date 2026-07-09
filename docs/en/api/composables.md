# Composables

Public composables and advanced runtime helpers are exported from the root package.

## Editor Context

```ts
import { provideYanivEditor, useYanivEditor } from "@yanivjs/yaniv-editor";
```

Use these when custom tool components need access to the active editor instance. Editor root and overlay portal are provided by `EditorShell` via `provideEditorRoot` / `provideOverlayPortal`; custom shells must set these up—see [Z-Index & Overlays](../guide/z-index.md).

## Visual Context

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

`YanivEditor` drives visual state with `appearance`, `colorMode`, and optional `customAppearanceVars`. Use `zIndexBase` for overlay stacking—do not override `--ye-z-base` via `customAppearanceVars`.

## Bubble Menu Helpers

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

## Editor State Helpers

```ts
import { useEditorColorState, useFindReplaceHotkey } from "@yanivjs/yaniv-editor";
```

## Runtime And Capabilities

Advanced integration can compose the same runtime pipeline used by the built-in components:

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

## Locales

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

## AI Subpackage

AI extensions and UI are exported from `@yanivjs/yaniv-editor/ai`, not the root package:

```ts
import { ContinueWritingExtension, AiMenuButton, useAiConfig } from "@yanivjs/yaniv-editor/ai";
```
