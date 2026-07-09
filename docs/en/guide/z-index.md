# Z-Index & Overlay Mounting

All **global overlays** (bubble menus, BlockPicker, mention suggestions, AI popover, Ant Design Dropdown / Select / Popover / Modal / Tooltip, etc.) mount inside the **overlay portal** (`.yaniv-editor__overlay-portal`) on the `EditorShell` root—**not** on `document.body`. Overlays stay within the `.yaniv-editor` scope and inherit `--ye-z-*` CSS tokens correctly.

Exceptions (non-visual overlays):

- HTML5 drag preview nodes (`setDragImage`)
- Hidden `<input type="file">` elements

## Host configuration

Both `YanivEditor` and `YanivInlineEditor` accept `zIndexBase` (default `1000`). The shell writes it to `--ye-z-base` on the editor root:

```vue
<YanivEditor :z-index-base="1500" />
<YanivInlineEditor v-model:content="html" :z-index-base="1500" />
```

This prop does **not** rebuild the session.

### When to adjust

| Scenario                                       | Suggestion                                                       |
| ---------------------------------------------- | ---------------------------------------------------------------- |
| Editor is main content                         | Keep default `1000`                                              |
| Host fixed header / sidebar (z-index ~100–500) | Default is fine                                                  |
| Host Modal / Drawer must cover editor overlays | Host overlay z-index > **1100**, or lower editor `zIndexBase`    |
| Editor inside a host Modal                     | Raise `zIndexBase`, or ensure host Modal stacks above the editor |

To cover **all** editor overlays (including in-editor Modals), host UI must be above `zIndexBase + 100` (default **1100**).

## Token ladder (`variables.css`)

Color tokens live on `:root`; **z-index tokens are scoped to `.yaniv-editor` only**:

| Token                     | Value (base=1000) | Use                              |
| ------------------------- | ----------------- | -------------------------------- |
| `--ye-z-content`          | `1`               | In-document base                 |
| `--ye-z-content-overlay`  | `2`               | Table selection, etc.            |
| `--ye-z-content-control`  | `10`              | Image column handles             |
| `--ye-z-editor-ui`        | `20`              | Drag handle                      |
| `--ye-z-editor-rail`      | `30`              | Outline rail                     |
| `--ye-z-chrome`           | `40`              | Top / bottom chrome              |
| `--ye-z-tooltip`          | `50`              | Toolbar tooltips                 |
| `--ye-z-overlay-backdrop` | `base`            | Block picker backdrop            |
| `--ye-z-bubble-menu`      | `base + 10`       | Link / image / table bubbles     |
| `--ye-z-floating-menu`    | `base + 20`       | Text selection floating menu     |
| `--ye-z-picker-menu`      | `base + 30`       | BlockPicker, mention, AI popover |
| `--ye-z-drag-menu`        | `base + 40`       | Drag block menu                  |
| `--ye-z-drag-submenu`     | `base + 41`       | Drag submenu                     |
| `--ye-z-dropdown`         | `base + 50`       | Ant Design dropdowns             |
| `--ye-z-modal`            | `base + 100`      | In-editor Modal                  |

Relative order: `modal > dropdown > drag-menu > picker-menu > floating-menu > bubble-menu > backdrop`.

## Implementation notes (custom Shell)

If you build a custom Shell instead of `EditorShell`:

1. Root node has `yaniv-editor` class;
2. Root contains `.yaniv-editor__overlay-portal` (see `src/styles/overlay-portal.css`);
3. Call `provideEditorRoot` / `provideOverlayPortal` (`src/core/editorContext.ts`);
4. All teleport / BubbleMenu `appendTo` / Ant Design `getPopupContainer` / `getContainer` target the overlay portal;
5. Read tokens via `getYeZIndex(token, root)` or `useYeZIndex(token)` (`src/utils/zIndex.ts`) with the editor root—no global fallback.

Library entry points:

- `useOverlayMountTarget()` — Ant Design `getPopupContainer` / Modal `getContainer`
- `useOverlayBubbleMenu()` — Tiptap 3 BubbleMenu (Floating UI) `appendTo` + `options`

Both live in `src/composables/useOverlayMount.ts`.

## Related

- [Integration props](./integration-props.md)
- [Contextual UI](../features/contextual-ui.md)
- [Project structure — CSS layers](../contributing/project-structure.md)
