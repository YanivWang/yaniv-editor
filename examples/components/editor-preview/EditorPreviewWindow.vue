<template>
  <div class="editor-preview__window" :class="{ 'is-entered': entered }">
    <EditorPreviewTitlebar />
    <EditorPreviewToolbar :active-format="activeFormat" />
    <EditorPreviewContent :visible-lines="visibleLines" :is-typing="isTyping" />
  </div>
</template>

<script setup lang="ts">
import EditorPreviewContent from "./EditorPreviewContent.vue";
import EditorPreviewTitlebar from "./EditorPreviewTitlebar.vue";
import EditorPreviewToolbar from "./EditorPreviewToolbar.vue";

import type { ContentLine } from "./types";

defineProps<{
  entered: boolean;
  activeFormat: string;
  visibleLines: ContentLine[];
  isTyping: boolean;
}>();
</script>
