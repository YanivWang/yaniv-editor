# Feature Matrix

Editor capabilities and entry points summarized by preset. `features` can override preset defaults.

## FeatureConfig Keys

| Key             | basic | full | notion | Entry (full header)   | Entry (notion)               |
| --------------- | :---: | :--: | :----: | --------------------- | ---------------------------- |
| `image`         |  ✅   |  ✅  |   ✅   | Header image          | `/` or floating menu         |
| `video`         |  ❌   |  ✅  |   ✅   | Header video          | `/` or floating menu         |
| `table`         |  ❌   |  ✅  |   ✅   | Header table          | `/` or floating menu         |
| `math`          |  ❌   |  ✅  |   ✅   | Header formula        | `/`                          |
| `ai`            |  ❌   | ❌\* |   ✅   | Floating menu AI†     | Floating menu AI             |
| `formatPainter` |  ❌   |  ✅  |   ❌   | Header format painter | —                            |
| `outline`       |  ❌   |  ✅  |   ✅   | Header outline        | Left outline panel           |
| `searchReplace` |  ❌   |  ✅  |   ✅   | Header / Ctrl+F       | Ctrl/Cmd+F                   |
| `officePaste`   |  ❌   |  ✅  |   ✅   | Paste as-is           | Paste as-is                  |
| `slashCommand`  |  ❌   |  ❌  |   ✅   | —                     | Type `/` on empty line       |
| `dragHandle`    |  ❌   |  ❌  |   ✅   | —                     | Six-dot handle on block left |

\* full requires `:features="{ ai: true }"` and `:ai-config`  
† full disables the AI gate by default; when enabled, there is no dedicated header AI button—AI is mainly accessed via the floating menu

## Non–FeatureConfig Capabilities (Preset Toolbar)

| Feature            | basic | full | notion | Control                                    |
| ------------------ | :---: | :--: | :----: | ------------------------------------------ |
| Word import/export |  ❌   |  ✅  |   ❌   | full preset header                         |
| Document templates |  ❌   |  ✅  |   ❌   | full preset header                         |
| Image gallery      |  ❌   |  ✅  |   ❌   | full preset header (requires `image` gate) |
| Fixed header       |  ✅   |  ✅  |   ❌   | preset layout                              |
| Fixed footer       |  ✅   |  ✅  |   ❌   | preset layout                              |
| Floating text menu |  ❌   |  ✅  |   ✅   | preset layout                              |
| Link bubble        |  ✅   |  ✅  |   ✅   | preset layout                              |

## Core Editing (Always Registered)

The following capabilities are **always available** across Full Editor presets (not controlled by `features`):

Links, headings H1–H6, lists (ordered/unordered/task), blockquote, code blocks, text color and highlight, alignment, superscript/subscript (full header), line height, character count, and more. See [Core Editing](./core-editing.md).

## Layout Chrome

| Layout item             | basic | full | notion |
| ----------------------- | :---: | :--: | :----: |
| Header                  |  ✅   |  ✅  |   ❌   |
| Footer                  |  ✅   |  ✅  |   ❌   |
| Floating menu           |  ❌   |  ✅  |   ✅   |
| Keyboard shortcut hints |  ❌   |  ✅  |   ❌   |

## Local Demo

After running `pnpm dev`, visit [http://localhost:9527](http://localhost:9527):

- `/full-editor` — preset / appearance / features switching
- `/inline-editor` — Inline toolbar toggles
- `/inline-compose` — custom toolbar slot
- `/multi-instance` — multi-instance locale / appearance isolation
