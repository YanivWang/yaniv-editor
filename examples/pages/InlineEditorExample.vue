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
