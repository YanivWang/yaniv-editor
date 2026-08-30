# Feature Matrix

Editor capabilities and entry points summarized by preset. `features` can override preset defaults.

## FeatureConfig Keys

| Key             | basic | full | notion | Entry (full header)        | Entry (notion)               |
| --------------- | :---: | :--: | :----: | -------------------------- | ---------------------------- |
| `image`         |  ✅   |  ✅  |   ✅   | Header image               | `/` or floating menu         |
| `video`         |  ❌   |  ✅  |   ✅   | Header video               | `/` or floating menu         |
| `table`         |  ❌   |  ✅  |   ✅   | Header table               | `/` or floating menu         |
| `math`          |  ❌   |  ✅  |   ✅   | Header formula             | `/`                          |
| `ai`            |  ❌   | ❌\* |   ✅   | Header AI + floating menu† | Floating menu AI             |
| `formatPainter` |  ❌   |  ✅  |   ❌   | Header format painter      | —                            |
| `outline`       |  ❌   |  ✅  |  ✅‡   | Header outline             | No entry point‡              |
| `searchReplace` |  ❌   |  ✅  |  ✅‡   | Header / Ctrl+F            | No entry point‡              |
| `officePaste`   |  ❌   |  ✅  |   ✅   | Paste as-is                | Paste as-is                  |
| `slashCommand`  |  ❌   |  ❌  |   ✅   | —                          | Type `/` on empty line       |
| `dragHandle`    |  ❌   |  ❌  |   ✅   | —                          | Six-dot handle on block left |

\* full requires `:features="{ ai: true }"` and `:ai-config`  
† full disables the AI gate by default; when enabled, the header shows `AiMenuButton` in the assistant row, and the floating menu also exposes AI  
‡ notion enables the gate by default (the extensions register), but the outline toggle and find/replace buttons exist **only in the header**, which notion hides; notion's toolbar config also leaves `outline` / `searchReplace` at `false`. So under notion the outline panel never renders and Ctrl/Cmd+F is never bound (the shortcut is registered by `FindReplaceButton`). See [Outline](./outline.md) and [Find and Replace](./find-replace.md).

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

## Presets decide bundle size, not just runtime registration

Capabilities disabled by `preset` / `features` **never enter your bundle**. Everything the
`basic` preset turns off is loaded through a dynamic `import()` in the capability registry, and
the matching toolbar components are `defineAsyncComponent`.

| Entry        | gzipped |
| ------------ | ------- |
| main chunk   | ~42 KB  |
| `style.css`  | ~18 KB  |
| `inline.css` | ~9 KB   |

table / video / math / outline / find-replace / format painter / Office paste / AI / Notion
blocks / drag handle / slash command each land in their own chunk, fetched only when the gate
is on. A CI assertion keeps them out of the main chunk.
