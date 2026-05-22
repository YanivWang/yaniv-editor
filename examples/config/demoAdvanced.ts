/** Demo 用：appearance="custom" 时传入的 CSS 变量（无 custom.css，靠内联 token 覆盖） */
export const DEMO_CUSTOM_APPEARANCE_VARS: Record<string, string> = {
  "--ye-primary": "#6366f1",
  "--ye-bg": "#f8fafc",
  "--ye-text": "#0f172a",
};

export const SNIPPET_BUILD_EDITOR_EXTENSIONS = `import { ref } from "vue";
import { Editor } from "@tiptap/vue-3";
import { buildExtensions, resolveEditorProfile } from "@yanivjs/yaniv-editor";
// locale 需异步加载，见 YanivEditor 内部 resolveLocaleMessages

const profile = resolveEditorProfile({ preset: "full", features: { ai: true } });

const extensions = await buildExtensions("full", {
  locale, // TiptapLocale
  gates: profile.gates,
  isEditable: ref(true),
  blockMenuHost, // 块菜单宿主（斜杠命令 / 拖拽手柄）
  upload: { image: () => uploadImage, video: () => uploadVideo },
  galleryImages: () => galleryImages ?? [],
  officePaste: { onPasteFromOfficeWithImages: () => onOfficePaste },
  outline: {
    scrollParent: () => scrollEl,
    bindScrollParent: (el) => { scrollEl = el; },
  },
  aiConfig: () => aiConfig,
});

const editor = new Editor({ extensions, content: "<p></p>" });`;

export const SNIPPET_INLINE_EXTENSIONS = `import { ref } from "vue";
import { Editor } from "@tiptap/vue-3";
import {
  buildExtensions,
  resolveInlineGates,
  CAPABILITIES,
} from "@yanivjs/yaniv-editor/inline";

const gates = resolveInlineGates({ link: true, heading: true }, CAPABILITIES);

const extensions = await buildExtensions("inline", {
  locale,
  gates,
  isEditable: ref(true),
  blockMenuHost: stubBlockMenuHost,
  upload: { image: () => undefined, video: () => undefined },
  galleryImages: () => [],
  officePaste: { onPasteFromOfficeWithImages: () => undefined },
  outline: { scrollParent: () => null, bindScrollParent: () => {} },
  aiConfig: () => undefined,
  inlinePlaceholder: "写点什么…",
});

const editor = new Editor({ extensions, content: "<p></p>" });`;

export const SNIPPET_INLINE_COMPOSE = `<YanivInlineEditor v-model:content="html" :toolbar="toolbar">
  <template #toolbar="{ editor, config }">
    <UndoRedoButton v-if="config.undoRedo" :editor="editor" />
    <HeadingControl v-if="config.heading" :editor="editor" />
    <!-- 其余按钮按需挂载；扩展仍由 toolbar 配置驱动 -->
  </template>
</YanivInlineEditor>`;

export const SNIPPET_CUSTOM_APPEARANCE = `<YanivEditor
  appearance="custom"
  :custom-appearance-vars="{ '--ye-primary': '#6366f1' }"
/>`;
