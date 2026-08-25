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

Appears only when there is a **non-empty text selection** (`shouldShowFloatingTextToolbar`), positioned near that selection; an empty cursor does not trigger it. It is also suppressed when the selection is a NodeSelection, when the cursor is inside a code block / table / image / video / link, when the selection abuts a media node, or while a block drag is in progress (`isBubbleMenuBlocked`).

Contents: heading dropdown, bold/italic/underline/strike, text color and highlight, link, lists; plus `AiMenuButton` when the AI gate is on. It does **not** include alignment or clear formatting.

## Bubbles / Context Bars

| Selection type | UI                                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| Link           | Link bubble — edit URL, remove link                                                                            |
| Image          | Image context bar — alignment, preview, delete (drag-resize comes from the node handles, not this bar)         |
| Video          | Video context bar — preview playback, delete                                                                   |
| Table cell     | Table context bar — add/remove rows/cols, merge/split, header row/column, delete table (no cell background UI) |

## Block Menu

BlockPickerMenu triggered by slash command and drag handle (see [Block Editing](./block-editing.md)). Menus mount via the overlay portal and inherit `.yaniv-editor` z-index tokens.

## Overlay Mounting

Bubble menus, BlockPicker, mention suggestions, AI popover, etc. mount inside `.yaniv-editor__overlay-portal` on `EditorShell`—not on `document.body`. See [Z-Index & Overlays](../guide/z-index.md).

## Mobile

When the viewport is ≤768px (`matchMedia("(width <= 768px)")`), `ToolbarNav` intersects the preset config with `COMPACT_TOOLBAR_CONFIG`, collapsing the header to the compact tool band.

COMPACT acts as a **mask** here (an intersection): it can only narrow the tool band further, never re-open a capability the gate turned off — e.g. `preset="basic"` (AI gate off) does not render `AiMenuButton` on a narrow viewport.

## Session Loading

During rebuild when `sessionKey` changes, a skeleton placeholder is shown to avoid chrome white-flash.

## Related

- [Preview Mode](../guide/preview-mode.md)
- [Architecture — ChromePolicy](../contributing/architecture.md#chromepolicy)
