# Project Structure

Important source areas:

- `src/core`: public Vue components and component-level orchestration.
- `src/configs`: public config types and Full/Inline default configuration.
- `src/extensions`: Tiptap extension construction and ability gates.
- `src/components/editor`: reusable editor controls.
- `src/components/tools`: editor chrome and contextual tools.
- `src/appearance`: appearance and color utilities.
- `src/styles`: explicit CSS entries.

Full Editor API decisions belong in `src/core/editorTypes.ts`, `src/configs/editorPreset.ts`, and `src/core/useEditorFeatures.ts`.

Inline Editor toolbar decisions belong in `src/configs/inlineToolbar.ts` and `src/configs/inlineTypes.ts`.
