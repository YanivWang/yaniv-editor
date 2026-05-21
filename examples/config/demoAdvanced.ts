/** 示例总览「高级接入」代码片段（仅展示，非运行） */

export const SNIPPET_BUILD_EDITOR_EXTENSIONS = `import { buildEditorExtensions, resolveExtensionGates } from "@yanivjs/yaniv-editor";

const gates = resolveExtensionGates({
  features: { ai: true, table: true },
});

const extensions = buildEditorExtensions({ gates });`;

export const SNIPPET_INLINE_EXTENSIONS = `import {
  buildInlineExtensions,
  resolveInlineExtensionGates,
} from "@yanivjs/yaniv-editor/inline";

const extensions = buildInlineExtensions({
  gates: resolveInlineExtensionGates({
    toolbar: { undoRedo: true, textFormat: true, link: true },
  }),
  placeholder: "写点什么…",
});`;

export const SNIPPET_REGISTER_APPEARANCE = `import { registerAppearance } from "@yanivjs/yaniv-editor";

registerAppearance("custom", {
  "--ye-primary": "#e11d48",
  "--ye-primary-hover": "#be123c",
  "--ye-bg": "#fff1f2",
});

// <YanivEditor appearance="custom" />`;

export const DEMO_CUSTOM_APPEARANCE_VARS: Record<string, string> = {
  "--ye-primary": "#e11d48",
  "--ye-primary-hover": "#be123c",
  "--ye-primary-light": "rgba(225, 29, 72, 0.12)",
  "--ye-bg": "#fff1f2",
  "--ye-toolbar-bg": "#ffe4e6",
  "--ye-border": "#fecdd3",
};
