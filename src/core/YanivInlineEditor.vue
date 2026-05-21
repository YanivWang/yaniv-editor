<template>
  <EditorShell
    ref="shellRef"
    host="inline"
    :inline-props="props"
    @update:content="$emit('update:content', $event)"
  >
    <template #toolbar="{ editor: ed, config }">
      <slot name="toolbar" :editor="ed" :config="config">
        <InlineToolbar v-if="ed && config" :editor="ed" :config="config" />
      </slot>
    </template>
  </EditorShell>
</template>

<script setup lang="ts">
import { ref } from "vue";

import { InlineToolbar } from "@/components/tools/inline-toolbar";
import type { YanivInlineEditorProps, YanivInlineEditorExpose } from "@/configs/inlineTypes";
import EditorShell from "@/core/shell/EditorShell.vue";
import type { EditorShellExpose } from "@/core/shell/exposeTypes";

const props = withDefaults(defineProps<YanivInlineEditorProps>(), {
  content: "<p></p>",
  mode: "edit",
  locale: "zh-CN",
  colorMode: "light",
});

defineEmits<{
  "update:content": [content: string];
}>();

const shellRef = ref<EditorShellExpose | null>(null);

defineExpose({
  getEditor: () => shellRef.value?.getEditor() ?? null,
  getJSON: () => shellRef.value?.getJSON() ?? null,
  getHTML: () => shellRef.value?.getHTML() ?? "",
  getText: () => shellRef.value?.getText() ?? "",
} satisfies YanivInlineEditorExpose);
</script>
