# Composables

Public composables and advanced runtime helpers are exported from the root package.

## Editor Context

```ts
import { provideYanivEditor, useYanivEditor } from "@yanivjs/yaniv-editor";
```

Use these when custom tool components need access to the active editor instance.

The editor root and overlay portal are provided internally by `EditorShell` through `provideEditorRoot` / `provideOverlayPortal`. **Those functions, along with `useEditorRoot` / `useOverlayPortal` / `getYeZIndex`, are not part of the package's public exports today** (they live only in `src/core/editorContext.ts` and `src/utils/zIndex.ts`), so building a shell entirely from scratch requires forking the repo; custom tool components layered on top of `YanivEditor` / `YanivInlineEditor` are unaffected. See [Z-Index & Overlays](../guide/z-index.md) for the conventions.

## Visual Context

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

`EDITOR_APPEARANCES` lists only the three appearances backed by a CSS file (`default` / `notion` / `word`); `custom` is not included.

`YanivEditor` drives visual state with `appearance`, `colorMode`, and optional `customAppearanceVars`. Use `zIndexBase` for overlay stacking—do not override `--ye-z-base` via `customAppearanceVars`.

## Bubble Menu Helpers

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

## Overlay Mounting & Feedback

```ts
import {
  useOverlayMountTarget,
  useOverlayBubbleMenu,
  useOverlayFeedback,
} from "@yanivjs/yaniv-editor";
```

- `useOverlayMountTarget` / `useOverlayBubbleMenu` — Ant Design / BubbleMenu mount to overlay portal.
- `useOverlayFeedback` — Toast / Notice (replaces Ant Design static `message` / `notification`).

See [Z-Index & Overlays](../guide/z-index.md).

## Editor State Helpers

```ts
import { useEditorColorState, useFindReplaceHotkey } from "@yanivjs/yaniv-editor";
```

`useFindReplaceHotkey({ enabled, onOpen, target? })` listens for `keydown` on the **editor root node** rather than on the global document:

- the shortcut is per-instance, so multiple editors on one page never collide;
- Ctrl/Cmd+F is not intercepted while focus is outside the editor, leaving the browser's native find intact;
- the root is injected from `EditorShell` by default; a custom shell can pass `target: Ref<HTMLElement | null>` explicitly.

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
  adaptJsonToSchema,
  parseContentToDoc,
  prepareEditorContent,
  applyPhaseTransition,
  BYPASS_GUARD_META,
} from "@yanivjs/yaniv-editor";
```

- `ContentAdapter` / `adaptJsonToSchema` / `prepareEditorContent`: clean unknown nodes and marks for cross-schema writes (session rebuild, controlled JSON).
- `parseContentToDoc(content, schema)`: parse HTML or JSON into a schema-valid ProseMirror doc, falling back to an empty paragraph on failure.
- `BYPASS_GUARD_META`: transaction meta that bypasses `withTransactionGuard`; `ContentAdapter.setContent` sets it for you.

## Accessibility

```ts
import { useRovingTabindex } from "@yanivjs/yaniv-editor";
```

| Composable             | Purpose                                                                                                                        | Exported?          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| `useRovingTabindex`    | Collapse a container into a single WAI-ARIA APG tab stop; arrow keys / Home / End move inside it                               | ✅                 |
| `useVirtualFocusPopup` | Popups that keep focus in the document: sets `aria-expanded` / `aria-controls` / `aria-activedescendant` on the editor content | ❌ internal (fork) |

`useRovingTabindex(containerRef)` rescans the container with a `MutationObserver` — lazily loaded toolbar buttons are not mounted on the first frame. Arrow keys inside text-entry controls (`input` / `textarea` / `contenteditable` / `role="combobox"`) are not hijacked, and neither are arrow keys with modifiers.

`useVirtualFocusPopup` currently serves only the built-in `BlockPickerMenu` / `MentionSuggestionMenu` and is **not** part of the package exports (it lives in `src/composables/useVirtualFocusPopup.ts`).

Reusing it for a custom toolbar:

```ts
const toolbarRef = ref<HTMLElement | null>(null);
useRovingTabindex(toolbarRef);
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
  BUILTIN_LOCALE_CODES,
} from "@yanivjs/yaniv-editor";
```

The global `t()` / `createI18n()` operate on the module-level `currentLocale` in `locales/manager.ts` and are **for non-component / fallback use only**. Chrome components inside the editor read the per-instance locale injected by `provideEditorLocale`, so changing the global locale does not affect mounted editors — use the `locale` prop instead.

## AI Subpackage

AI extensions and UI are exported from `@yanivjs/yaniv-editor/ai`, not the root package:

```ts
import { ContinueWritingExtension, AiMenuButton, useAiConfig } from "@yanivjs/yaniv-editor/ai";
```
