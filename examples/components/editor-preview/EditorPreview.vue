<template>
  <div class="editor-preview" :data-theme="theme">
    <div class="editor-preview__glow"></div>

    <EditorPreviewWindow
      :entered="entered"
      :active-format="activeFormat"
      :visible-lines="visibleLines"
      :is-typing="isTyping"
    />

    <EditorPreviewLabels :entered="entered" />
  </div>
</template>

<script setup lang="ts">
import EditorPreviewLabels from "./EditorPreviewLabels.vue";
import EditorPreviewWindow from "./EditorPreviewWindow.vue";
import { useEditorPreviewDemo } from "./useEditorPreviewDemo";

import "./editor-preview.css";

defineProps<{
  theme: "light" | "dark";
}>();

const { visibleLines, isTyping, activeFormat, entered } = useEditorPreviewDemo();
</script>
