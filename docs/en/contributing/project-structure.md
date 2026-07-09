# Project Structure

Main source directories:

- `src/core` — shared Vue components, session lifecycle, runtime orchestration
- `src/core/runtime` — pure profile/chrome/session-key derivation and `useEditorRuntime`
- `src/capabilities` — capability registry, extension builder, toolbar gate mapping
- `src/configs` — public config types and Full/Inline defaults
- `src/extensions` — Tiptap extension implementations
- `src/components/editor` — reusable editor controls
- `src/components/tools` — editor chrome and contextual tools
- `src/appearance` — appearance and color utilities
- `src/shared` — shared modules (e.g. local Ant Design Vue registration in `antd.ts`)
- `src/styles` — explicit CSS entry points
- `src/utils/zIndex.ts` — read `--ye-z-*` tokens from the `.yaniv-editor` root
- `src/composables/useOverlayMount.ts` — `useOverlayMountTarget` / `useOverlayBubbleMenu` for overlay portal mounting

Full Editor API decisions live in `src/core/editorTypes.ts`, `src/configs/editorPreset.ts`, and `src/core/runtime/resolveEditorProfile.ts`.

Inline Editor toolbar decisions live in `src/configs/inlineToolbar.ts` and `src/configs/inlineTypes.ts`.

Preset default abilities are defined only in `src/core/runtime/resolveEditorProfile.ts`. `editorPreset.ts` holds toolbar and layout defaults only.

Runtime architecture: [Architecture](./architecture.md). Full normative spec: root [`ARCHITECTURE.md`](https://github.com/YanivWang/yaniv-editor/blob/main/ARCHITECTURE.md).

## CSS Layers

Styles split into structure, functional chrome, and appearance. Do not duplicate structure rules in appearance files.

| Layer             | Location                                                | Responsibility                                                   |
| ----------------- | ------------------------------------------------------- | ---------------------------------------------------------------- |
| Tokens            | `src/styles/variables.css`                              | `--ye-*` tokens; colors on `:root`, z-index on `.yaniv-editor`   |
| Structure         | `src/styles/content.css`, `table.css`, `code-block.css` | ProseMirror borders, backgrounds, interaction semantics          |
| Functional chrome | `src/styles/*.css`, `src/components/tools/**`           | Toolbar, menus, drag handle, outline, `overlay-portal.css`, etc. |
| Appearance        | `src/appearance/styles/*.css`                           | Theme tokens and typography (margin, font-size, padding)         |

Import order is defined in `src/styles/index.css` (Full) and `src/styles/inline.css` (Inline). Both import `content.css` and `overlay-portal.css` before appearance CSS.

Rules:

- Appearance files may override `--ye-*` tokens and typography (**do not** override z-index via `customAppearanceVars`; use `zIndexBase` prop).
- Do not redeclare `border` / `background` shorthands on selectors already owned by structure files.
- `block-hover.css` ships with the Full bundle but only applies under `.appearance-notion` (Notion block hover highlight).
- `appearance="custom"` has no theme file; override visual tokens on the editor root via `:custom-appearance-vars`.
- Global overlays (bubble menus, BlockPicker, mention, AI popover, etc.) mount via `.yaniv-editor__overlay-portal` inside `EditorShell`. See [Z-Index & Overlays](../guide/z-index.md).

Host usage: [Appearance and Color](../guide/appearance.md), [Integration Props](../guide/integration-props.md).
