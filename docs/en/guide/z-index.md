# Z-Index and Overlay Mounting

All **global overlays** (bubble menus, BlockPicker, mention suggestions, AI popover, Ant Design dropdowns, etc.) mount inside the **overlay portal** (`.yaniv-editor__overlay-portal`) on the `EditorShell` root—not on `document.body`. Overlays stay within the `.yaniv-editor` scope and inherit `--ye-z-*` CSS tokens correctly.

## Host Configuration

Both `YanivEditor` and `YanivInlineEditor` support the `zIndexBase` prop (default `1000`). The shell writes it to `--ye-z-base` on the editor root:

```vue
<YanivEditor :z-index-base="1500" />
<YanivInlineEditor v-model:content="html" :z-index-base="1500" />
```

This prop **does not trigger session rebuild**.

### When to Adjust

| Scenario                                              | Recommendation                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------- |
| Editor is main content; normal editing                | Keep default `1000`                                               |
| Host has fixed header / sidebar (z-index ~100–500)    | Default is fine                                                   |
| Host global Modal / Drawer must cover editor overlays | Host z-index > **1100** (see table), or lower editor `zIndexBase` |
| Editor embedded inside host Modal                     | Raise `zIndexBase`, or ensure host Modal stacks above             |

To fully cover **all** editor overlays (including in-editor modals), host UI needs z-index above `zIndexBase + 100` (default **1100**).

## Token Layers (`variables.css`)

Color tokens live on `:root`; **z-index tokens are defined only on `.yaniv-editor`**:

| Token                     | Value (default base=1000) | Use                              |
| ------------------------- | ------------------------- | -------------------------------- |
| `--ye-z-content`          | `1`                       | In-document base                 |
| `--ye-z-content-overlay`  | `2`                       | Table selection overlay          |
| `--ye-z-content-control`  | `10`                      | Image resize handle, etc.        |
| `--ye-z-editor-ui`        | `20`                      | Drag handle                      |
| `--ye-z-editor-rail`      | `30`                      | Outline panel                    |
| `--ye-z-chrome`           | `40`                      | Header / footer                  |
| `--ye-z-tooltip`          | `50`                      | Toolbar tooltips                 |
| `--ye-z-overlay-backdrop` | `base`                    | Block picker backdrop            |
| `--ye-z-bubble-menu`      | `base + 10`               | Link / image / table bubbles     |
| `--ye-z-floating-menu`    | `base + 20`               | Floating text toolbar            |
| `--ye-z-picker-menu`      | `base + 30`               | BlockPicker, mention, AI popover |
| `--ye-z-drag-menu`        | `base + 40`               | Drag block menu                  |
| `--ye-z-drag-submenu`     | `base + 41`               | Drag submenu                     |
| `--ye-z-dropdown`         | `base + 50`               | Ant Design dropdowns             |
| `--ye-z-modal`            | `base + 100`              | In-editor modals                 |

Overlay order: `modal > dropdown > drag-menu > picker-menu > floating-menu > bubble-menu > backdrop`.

## Custom Shell Requirements

If you build a custom shell instead of `EditorShell`:

1. Root element has class `yaniv-editor`;
2. Root contains `.yaniv-editor__overlay-portal` (see `src/styles/overlay-portal.css`);
3. Call `provideEditorRoot` / `provideOverlayPortal` (`src/core/editorContext.ts`);
4. All teleports and Tippy `appendTo` target the overlay portal;
5. Read tokens via `getYeZIndex(token, root)` or `useYeZIndex(token)` (`src/utils/zIndex.ts`)—**root is required**; there is no global fallback.

Tippy overlays use `useOverlayTippyOptions()` (`src/composables/useOverlayTippyOptions.ts`) internally.

## Related

- [Integration Props](./integration-props.md)
- [Contextual UI](../features/contextual-ui.md)
- [Project Structure — CSS layers](../contributing/project-structure.md)
