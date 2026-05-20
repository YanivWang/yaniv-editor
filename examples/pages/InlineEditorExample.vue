<template>
  <div class="demo-page demo-page--inline">
    <YanivInlineEditor
      v-model:content="html"
      v-bind="preset"
      class="demo-inline"
      placeholder="写一条评论…"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

import { YanivInlineEditor, mergeInlinePreset } from "@yanivjs/yaniv-editor/inline";

import "@yanivjs/yaniv-editor/inline.css";

const html = ref(
  "<p>开箱即用：<code>YanivInlineEditor</code> + preset，扩展与工具栏自动同步。</p>",
);

const preset = mergeInlinePreset("comment", {
  toolbar: { list: true },
});
</script>

<style scoped>
/* 居中展示行内编辑器，模拟评论框场景 */
.demo-page--inline {
  flex: 1;
  align-items: center;
  min-height: 0;
  padding: 24px;
  overflow: auto;
}

/* YanivInlineEditor 根节点；颜色/圆角来自 inline.css 的 --ye-* 变量 */
.demo-page--inline :deep(.demo-inline) {
  width: 100%;
  max-width: 720px;
  overflow: hidden;
  background: var(--ye-bg);
  border: 1px solid var(--ye-border);
  border-radius: var(--ye-radius-lg);
}
</style>
