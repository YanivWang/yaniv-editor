/** Demo 用：appearance="custom" 时传入的 CSS 变量（无 custom.css，靠内联 token 覆盖） */
export const DEMO_CUSTOM_APPEARANCE_VARS: Record<string, string> = {
  "--ye-primary": "#6366f1",
  "--ye-bg": "#f8fafc",
  "--ye-text": "#0f172a",
};

export const SNIPPET_BUILD_EDITOR_EXTENSIONS = `import { buildExtensions, resolveEditorProfile } from "@yanivjs/yaniv-editor";

const profile = resolveEditorProfile({ preset: "full" });
// 高级集成：自行组装 BuildExtensionsCtx 后调用 buildExtensions("full", ctx)`;

export const SNIPPET_INLINE_EXTENSIONS = `import { buildExtensions, resolveInlineGates } from "@yanivjs/yaniv-editor/inline";
import { CAPABILITIES } from "@yanivjs/yaniv-editor";

const gates = resolveInlineGates({ link: true, heading: true }, CAPABILITIES);
// buildExtensions("inline", { gates, locale, ... })`;

export const SNIPPET_CUSTOM_APPEARANCE = `<YanivEditor
  appearance="custom"
  :custom-appearance-vars="{ '--ye-primary': '#6366f1' }"
/>`;
