<template>
  <div ref="rootRef" class="yaniv-editor demo-inline">
    <div v-if="editor && !isPreviewMode" class="demo-inline__toolbar">
      <UndoRedoButton :editor="editor" />
      <HeadingControl variant="dropdown" :editor="editor" />
      <TextFormatButtons :editor="editor" />
      <ListTools :editor="editor" :show-task-list="true" />
      <AlignDropdown v-if="toolbar.align" :editor="editor" />
      <LinkButton v-if="toolbar.link" :editor="editor" />
      <ClearFormatButton v-if="toolbar.clearFormat" :editor="editor" />
      <CodeBlockDropdown v-if="toolbar.codeBlock" :editor="editor" />
    </div>
    <EditorContent v-if="editor" :editor="editor" class="demo-inline__content" />
  </div>
</template>

<script setup lang="ts">
import { Editor, EditorContent } from "@tiptap/vue-3";
import { computed, onBeforeUnmount, ref, shallowRef, watch } from "vue";

import {
  buildExtensions,
  CAPABILITIES,
  createI18n,
  loadLocale,
  resolveColorMode,
  watchSystemColorMode,
  type BuildExtensionsCtx,
  type EditorColorMode,
  type EditorMode,
} from "@yanivjs/yaniv-editor";
import {
  AlignDropdown,
  ClearFormatButton,
  CodeBlockDropdown,
  HeadingControl,
  LinkButton,
  ListTools,
  resolveInlineGates,
  TextFormatButtons,
  UndoRedoButton,
  type InlineToolbarConfig,
} from "@yanivjs/yaniv-editor/inline";

const props = defineProps<{
  toolbar: InlineToolbarConfig;
  mode: EditorMode;
  colorMode?: EditorColorMode;
}>();

const content = defineModel<string>("content", { required: true });
const isPreviewMode = computed(() => props.mode === "preview");
const isEditable = computed(() => props.mode === "edit");

createI18n();

const rootRef = ref<HTMLElement | null>(null);
const editor = shallowRef<Editor | null>(null);

const blockMenuHost: BuildExtensionsCtx["blockMenuHost"] = {
  registerInstance: () => {},
  activate: () => {},
  openInsert: () => {},
  hide: () => {},
  updateQuery: () => {},
};

function applyColorMode() {
  if (!rootRef.value) return;
  const resolved = resolveColorMode(props.colorMode ?? "light");
  rootRef.value.setAttribute("data-color-mode", resolved);
}

watch(() => props.colorMode, applyColorMode, { immediate: true });

let cleanupSystemWatch: (() => void) | undefined;
watch(
  () => props.colorMode,
  (mode) => {
    cleanupSystemWatch?.();
    if (mode === "auto") {
      cleanupSystemWatch = watchSystemColorMode(() => applyColorMode());
    }
  },
  { immediate: true },
);

async function initEditor() {
  const locale = await loadLocale("zh-CN");
  const gates = resolveInlineGates(props.toolbar, CAPABILITIES);
  const extensions = await buildExtensions("inline", {
    locale,
    gates,
    isEditable,
    blockMenuHost,
    upload: { image: () => undefined, video: () => undefined },
    galleryImages: () => [],
    officePaste: { onPasteFromOfficeWithImages: () => undefined },
    outline: { scrollParent: () => null, bindScrollParent: () => {} },
    aiConfig: () => undefined,
    inlinePlaceholder: "写点什么…",
  });

  editor.value?.destroy();
  editor.value = new Editor({
    content: content.value,
    editable: props.mode === "edit",
    extensions,
    editorProps: { attributes: { class: "inline-prose" } },
    onUpdate: ({ editor: ed }) => {
      content.value = ed.getHTML();
    },
  });
}

watch(
  () => [props.toolbar, props.mode],
  () => void initEditor(),
  { deep: true, immediate: true },
);

watch(
  () => props.mode,
  (next) => {
    editor.value?.setEditable(next === "edit");
  },
);

watch(content, (next) => {
  const ed = editor.value;
  if (!ed || next === ed.getHTML()) return;
  ed.commands.setContent(next, { emitUpdate: false });
});

onBeforeUnmount(() => {
  cleanupSystemWatch?.();
  editor.value?.destroy();
  editor.value = null;
});
</script>

<style scoped>
.demo-inline {
  width: 100%;
  max-width: 720px;
  overflow: hidden;
  background: var(--ye-bg);
  border: 1px solid var(--ye-border);
  border-radius: var(--ye-radius-lg);
}

.demo-inline__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  padding: 8px 12px;
  background: var(--ye-toolbar-bg);
  border-bottom: 1px solid var(--ye-border);
}

.demo-inline__content {
  min-height: 160px;
  padding: 12px 16px;
}
</style>
