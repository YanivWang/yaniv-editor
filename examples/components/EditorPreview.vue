<script setup lang="ts">
import EditorPreviewRoot from "./editor-preview/EditorPreview.vue";

defineProps<{
  theme: "light" | "dark";
}>();
</script>

<template>
  <EditorPreviewRoot :theme="theme" />
</template>
