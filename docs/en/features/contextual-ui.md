# Contextual UI

Beyond fixed header/footer, the editor shows contextual tools based on selection and preset.

## Fixed Layout (Layout Chrome)

Determined by preset, **not** toggled via `features`:

| Component               | basic | full | notion |
| ----------------------- | :---: | :--: | :----: |
| Header                  |  ✅   |  ✅  |   ❌   |
| Footer                  |  ✅   |  ✅  |   ❌   |
| Floating text menu      |  ❌   |  ✅  |   ✅   |
| Link bubble             |  ✅   |  ✅  |   ✅   |
| Table tools             |  ✅   |  ✅  |   ✅   |
| Keyboard shortcut hints |  ❌   |  ✅  |   ❌   |

Footer (basic / full): zoom 50–200%, page count, character count; full includes keyboard shortcut hints.

## Floating Text Menu

Appears when text is selected or at the start of an empty line. Provides formatting, color, links, lists, etc. (notion / full). AI entry appears when the AI gate is enabled.

## Bubbles / Context Bars

| Selection type | UI                                                     |
| -------------- | ------------------------------------------------------ |
| Link           | Link bubble — edit URL, remove link                    |
| Image          | Image context bar — alignment, preview, delete, resize |
| Video          | Video context bar — preview playback, delete           |
| Table cell     | Table context bar — row/column ops, merge/split        |

## Block Menu

BlockPickerMenu triggered by slash command and drag handle (see [Block Editing](./block-editing.md)).

## Mobile

When viewport ≤768px, the header automatically falls back to **COMPACT** layout (ToolbarNav).

## Session Loading

During rebuild when `sessionKey` changes, a skeleton placeholder is shown to avoid chrome white-flash.

## Related

- [Preview Mode](../guide/preview-mode.md)
- [Architecture — ChromePolicy](../contributing/architecture.md#chromepolicy)
