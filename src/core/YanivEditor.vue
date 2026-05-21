<template>
  <EditorShell ref="shellRef" host="full" :full-props="props" @update="$emit('update', $event)" />
</template>

<script setup lang="ts">
import { ref } from "vue";

import EditorShell from "@/core/shell/EditorShell.vue";
import type { EditorShellExpose } from "@/core/shell/exposeTypes";

import type { YanivEditorProps, YanivEditorExpose } from "./editorTypes";
import type { JSONContent } from "@tiptap/core";

const props = withDefaults(defineProps<YanivEditorProps>(), {
  mode: "edit",
  preset: "basic",
  appearance: "default",
  colorMode: "light",
  initialContent: "<p>开始编辑你的文档...</p>",
});

defineEmits<{
  update: [content: JSONContent];
}>();

const shellRef = ref<EditorShellExpose | null>(null);

defineExpose({
  getEditor: () => shellRef.value?.getEditor() ?? null,
  getJSON: () => shellRef.value?.getJSON() ?? null,
  getHTML: () => shellRef.value?.getHTML() ?? "",
  getText: () => shellRef.value?.getText() ?? "",
} satisfies YanivEditorExpose);
</script>
