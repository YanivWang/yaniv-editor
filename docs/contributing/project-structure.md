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
