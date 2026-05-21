<template>
  <div ref="rootRef" class="yaniv-editor demo-inline">
    <div v-if="editor" class="demo-inline__toolbar">
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
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { onBeforeUnmount, ref, watch } from "vue";

import { resolveColorMode, watchSystemColorMode } from "@/appearance/applyAppearance";
import type { EditorColorMode } from "@/configs/editorConfig";
import type { InlineToolbarConfig } from "@/configs/inlineTypes";
import type { EditorMode } from "@/core/editorTypes";

import {
  AlignDropdown,
  buildInlineExtensions,
  ClearFormatButton,
  CodeBlockDropdown,
  HeadingControl,
  LinkButton,
  ListTools,
  resolveInlineExtensionGates,
  TextFormatButtons,
  UndoRedoButton,
} from "@yanivjs/yaniv-editor/inline";

const props = defineProps<{
  toolbar: InlineToolbarConfig;
  mode: EditorMode;
  colorMode?: EditorColorMode;
}>();

const rootRef = ref<HTMLElement | null>(null);

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

onBeforeUnmount(() => {
  cleanupSystemWatch?.();
});

const editor = useEditor({
  content:
    "<h2>行内自行拼装</h2><p>自管 <code>Editor</code> 生命周期，按需挂载工具栏组件；扩展由 <code>buildInlineExtensions</code> 与 toolbar 同步。</p>",
  editable: props.mode === "edit",
  extensions: buildInlineExtensions({
    gates: resolveInlineExtensionGates({ toolbar: props.toolbar }),
  }),
  editorProps: {
    attributes: { class: "inline-prose" },
  },
});

watch(
  () => props.mode,
  (next) => {
    editor.value?.setEditable(next === "edit");
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  editor.value?.destroy();
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
