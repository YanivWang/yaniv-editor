# Project Structure

Important source areas:

- `src/core`: public Vue components, session lifecycle, and runtime orchestration.
- `src/core/runtime`: pure profile/chrome/session-key derivation and `useEditorRuntime`.
- `src/capabilities`: capability registry, extension builder, and toolbar gate mapping.
- `src/configs`: public config types and Full/Inline default configuration.
- `src/extensions`: Tiptap extension implementations.
- `src/components/editor`: reusable editor controls.
- `src/components/tools`: editor chrome and contextual tools.
- `src/appearance`: appearance and color utilities.
- `src/styles`: explicit CSS entries.

Full Editor API decisions belong in `src/core/editorTypes.ts`, `src/configs/editorPreset.ts`, and `src/core/runtime/resolveEditorProfile.ts`.

Inline Editor toolbar decisions belong in `src/configs/inlineToolbar.ts` and `src/configs/inlineTypes.ts`.

Preset default abilities are defined only in `src/core/runtime/resolveEditorProfile.ts`. `editorPreset.ts` owns toolbar and layout defaults only.

Runtime architecture: [Architecture](./architecture.md). Full normative spec: repository root [`ARCHITECTURE.md`](https://github.com/YanivWang/yaniv-editor/blob/main/ARCHITECTURE.md).

## CSS Layering

Styles are split into structure, feature chrome, and appearance. Do not duplicate structure rules in appearance files.

| Layer          | Location                                                | Responsibility                                              |
| -------------- | ------------------------------------------------------- | ----------------------------------------------------------- |
| Tokens         | `src/styles/variables.css`                              | `--ye-*` design tokens (light/dark)                         |
| Structure      | `src/styles/content.css`, `table.css`, `code-block.css` | ProseMirror borders, backgrounds, and interaction semantics |
| Feature chrome | `src/styles/*.css`, `src/components/tools/**`           | Toolbars, menus, drag handle, outline, etc.                 |
| Appearance     | `src/appearance/styles/*.css`                           | Theme tokens and typography (margin, font-size, padding)    |

Import order is defined in `src/styles/index.css` (Full) and `src/styles/inline.css` (Inline). Both import `content.css` before appearance CSS.

Rules:

- Appearance files may override `--ye-*` tokens and adjust typography.
- Do not redeclare `border` / `background` shorthand on selectors already owned by structure files (`content.css`, `table.css`, `code-block.css`).
- `block-hover.css` ships in the Full bundle but only applies under `.appearance-notion` (Notion block hover highlight).
- `appearance="custom"` has no theme file; use `:custom-appearance-vars` on the editor root to override tokens.

See [Appearance and Color](../guide/appearance.md) for host-facing usage.
