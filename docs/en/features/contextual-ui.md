# Contextual UI

Beyond fixed header/footer, the editor shows contextual tools based on selection and preset.

## Fixed Layout (Layout Chrome)

Determined by preset `layout`. Header/footer/floating menu/shortcut hints **cannot** be re-enabled by `features` alone. The table context bar also requires `features.table` (`uiFlags.tableTools = layout.tableTools && gates.table`).

| Component               | basic | full | notion | Notes                                           |
| ----------------------- | :---: | :--: | :----: | ----------------------------------------------- |
| Header                  |  ✅   |  ✅  |   ❌   | preset layout                                   |
| Footer                  |  ✅   |  ✅  |   ❌   | preset layout                                   |
| Floating text menu      |  ❌   |  ✅  |   ✅   | preset layout                                   |
| Link bubble             |  ✅   |  ✅  |   ✅   | preset layout                                   |
| Table tools             | ❌\*  |  ✅  |   ✅   | needs `gates.table`; \*basic defaults table off |
| Keyboard shortcut hints |  ❌   |  ✅  |   ❌   | preset layout                                   |

\* basic also shows the table context bar when `:features="{ table: true }"` (layout already enables `tableTools`).

Footer (basic / full): zoom 50–200%, page count, character count; full includes keyboard shortcut hints.

## Floating Text Menu

Appears when text is selected or at the start of an empty line. Provides formatting, color, links, lists, etc. (notion / full). AI entry appears when the AI gate is enabled.

## Bubbles / Context Bars

| Selection type | UI                                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| Link           | Link bubble — edit URL, remove link                                                                            |
| Image          | Image context bar — alignment, preview, delete, resize                                                         |
| Video          | Video context bar — preview playback, delete                                                                   |
| Table cell     | Table context bar — add/remove rows/cols, merge/split, header row/column, delete table (no cell background UI) |

## Block Menu

BlockPickerMenu triggered by slash command and drag handle (see [Block Editing](./block-editing.md)). Menus mount via the overlay portal and inherit `.yaniv-editor` z-index tokens.

## Overlay Mounting

Bubble menus, BlockPicker, mention suggestions, AI popover, etc. mount inside `.yaniv-editor__overlay-portal` on `EditorShell`—not on `document.body`. See [Z-Index & Overlays](../guide/z-index.md).

## Mobile

When viewport ≤768px, the header automatically falls back to **COMPACT** layout (ToolbarNav).

## Session Loading

During rebuild when `sessionKey` changes, a skeleton placeholder is shown to avoid chrome white-flash.

## Related

- [Preview Mode](../guide/preview-mode.md)
- [Architecture — ChromePolicy](../contributing/architecture.md#chromepolicy)
