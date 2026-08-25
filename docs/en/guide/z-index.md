# Z-Index & Overlay Mounting

All **global overlays** (bubble menus, BlockPicker, mention suggestions, AI popover, Ant Design Dropdown / Select / Popover / Modal / Tooltip, custom Toast / Notice, etc.) mount inside the **overlay portal** (`.yaniv-editor__overlay-portal`) on the `EditorShell` root—**not** on `document.body`. Overlays stay within the `.yaniv-editor` scope and inherit `--ye-z-*` CSS tokens correctly.

Exceptions (non-visual overlays):

- HTML5 drag preview nodes (`setDragImage`)
- Hidden `<input type="file">`

## Host configuration

Both `YanivEditor` and `YanivInlineEditor` support `zIndexBase` (default `1000`). The shell writes it to `--ye-z-base` on the editor root:

```vue
<YanivEditor :z-index-base="1500" />
<YanivInlineEditor v-model:content="html" :z-index-base="1500" />
```

This prop does **not** rebuild the session.

### When to adjust

| Scenario                                              | Suggestion                                                      |
| ----------------------------------------------------- | --------------------------------------------------------------- |
| Editor is main content                                | Keep default `1000`                                             |
| Host has fixed header / sidebar (z-index ~100–500)    | Default is fine                                                 |
| Host global Modal / Drawer must cover editor overlays | Host layer > **1100** (see table), or lower editor `zIndexBase` |
| Editor nested inside a host Modal                     | Raise `zIndexBase`, or ensure host Modal is above the editor    |

To cover **all** editor overlays (including in-editor Modal), host UI must be above `zIndexBase + 100` (default **1100**).

## Token ladder (`variables.css`)

Color tokens live on `:root`; **z-index tokens are only on `.yaniv-editor`**:

| Token                     | Value (base=1000) | Use                                        |
| ------------------------- | ----------------- | ------------------------------------------ |
| `--ye-z-content`          | `1`               | In-document base                           |
| `--ye-z-content-overlay`  | `2`               | Table selection, etc.                      |
| `--ye-z-content-control`  | `10`              | Image column handles, etc.                 |
| `--ye-z-editor-ui`        | `20`              | Drag handle                                |
| `--ye-z-editor-rail`      | `30`              | Outline rail                               |
| `--ye-z-chrome`           | `40`              | Header / footer                            |
| `--ye-z-chrome-tooltip`   | `50`              | In-document tooltips (`BaseTooltip`, etc.) |
| `--ye-z-overlay-backdrop` | `base`            | Block picker backdrop                      |
| `--ye-z-bubble-menu`      | `base + 10`       | Link / image / table bubble                |
| `--ye-z-floating-menu`    | `base + 20`       | Selection floating menu                    |
| `--ye-z-picker-menu`      | `base + 30`       | BlockPicker, mention, AI popover           |
| `--ye-z-drag-menu`        | `base + 40`       | Drag block menu                            |
| `--ye-z-drag-submenu`     | `base + 41`       | Drag submenu                               |
| `--ye-z-dropdown`         | `base + 50`       | Ant Design dropdown                        |
| `--ye-z-tooltip`          | `base + 60`       | Portal Ant Design Tooltip                  |
| `--ye-z-toast`            | `base + 80`       | Custom Toast / Notice                      |
| `--ye-z-modal`            | `base + 100`      | In-editor Modal                            |

Order: `modal > toast > tooltip > dropdown > drag-menu > picker-menu > floating-menu > bubble-menu > backdrop`.

## Toast / Notice

**Do not** use Ant Design static `message` / `notification` (global singleton, mounts to `document.body`, unsafe with multiple instances).

Unified APIs (in `src/core/overlayFeedback.ts` / `src/composables/useOverlayFeedback.ts`):

| Context                | Entry point                              | How the portal is located                       |
| ---------------------- | ---------------------------------------- | ----------------------------------------------- |
| Vue components         | `useOverlayFeedback()`                   | `useOverlayMountTarget()` (injected portal)     |
| Tiptap extensions      | `showEditorToast` / `showEditorNotice`   | `resolveOverlayPortalFromNode(editor.view.dom)` |
| Portal already in hand | `showOverlayToast` / `showOverlayNotice` | pass the `HTMLElement` directly                 |

`showEditorToast` / `showEditorNotice` are thin wrappers over `showOverlayToast` / `showOverlayNotice` that resolve the portal from the editor DOM first. All three end up in the current editor's overlay portal. Default durations: toast 2.5s, notice 3s.

Of these, only `useOverlayFeedback` is part of the package's public exports; `showOverlayToast` / `showEditorToast` and friends are library-internal today.

## Custom Shell checklist

If you build your own Shell instead of `EditorShell`:

1. Root has `yaniv-editor` class;
2. Root contains `.yaniv-editor__overlay-portal` (see `src/styles/overlay-portal.css`);
3. Call `provideEditorRoot` / `provideOverlayPortal` (`src/core/editorContext.ts`);
4. All teleport / BubbleMenu `appendTo` / Ant Design `getPopupContainer` / `getContainer` target the overlay portal;
5. Read portal tokens via `getYeZIndex(token, root)` (`src/utils/zIndex.ts`) with the editor root—no global fallback.

Library entry points:

- `useOverlayMountTarget()` — Ant Design `getPopupContainer` / Modal `getContainer`
- `useOverlayBubbleMenu()` — Tiptap 3 BubbleMenu (Floating UI) `appendTo` + `options`
- `useOverlayFeedback()` / `showOverlayToast` / `showOverlayNotice` — Toast / Notice

::: warning Building your own shell currently requires a fork
`provideEditorRoot` / `provideOverlayPortal` / `getYeZIndex` in the checklist above are **not** exported from `@yanivjs/yaniv-editor` (the public surface has only `useOverlayMountTarget` / `useOverlayBubbleMenu` / `useOverlayFeedback`). Replacing `EditorShell` wholesale therefore means forking the repo; writing custom tool components on top of the existing editors is unaffected.
:::

## Related

- [Integration props](./integration-props.md)
- [Contextual UI](../features/contextual-ui.md)
- [Project structure — CSS layers](../contributing/project-structure.md)
