<template>
  <div class="demo-page demo-page--inline">
    <DemoSubnav title="行内编辑器" :description="entry?.description" />
    <div class="demo-page--inline__panel">
      <DemoInlinePanel v-model:mode="inlineMode" v-model:toolbar="toolbar" />
    </div>
    <YanivInlineEditor
      :key="inlineKey"
      v-model:content="html"
      :mode="inlineMode"
      :toolbar="toolbar"
      class="demo-inline"
      placeholder="写一条评论…"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

import type { InlineToolbarConfig } from "@/configs/inlineTypes";
import type { EditorMode } from "@/core/editorTypes";

import { YanivInlineEditor } from "@yanivjs/yaniv-editor/inline";

import "@yanivjs/yaniv-editor/inline.css";

import DemoInlinePanel from "../components/DemoInlinePanel.vue";
import DemoSubnav from "../components/DemoSubnav.vue";
import { getDemoEntry } from "../config/demoCatalog";
import { inlineToolbarKey, INLINE_FULL_TOOLBAR } from "../config/demoInline";

const entry = getDemoEntry("inline-editor");

const html = ref(
  "<p>开箱即用：<code>YanivInlineEditor</code> + toolbar，扩展与工具栏自动同步。</p>",
);

const inlineMode = ref<EditorMode>("edit");
const toolbar = ref<InlineToolbarConfig>({ ...INLINE_FULL_TOOLBAR });

const inlineKey = computed(() => inlineToolbarKey(toolbar.value, inlineMode.value));
</script>

<style scoped>
.demo-page--inline {
  flex: 1;
  align-items: center;
  min-height: 0;
  padding: 24px;
  overflow: auto;
}

.demo-page--inline :deep(.demo-subnav),
.demo-page--inline__panel {
  align-self: stretch;
  width: 100%;
  max-width: 720px;
}

.demo-page--inline :deep(.demo-inline) {
  width: 100%;
  max-width: 720px;
  overflow: hidden;
  background: var(--ye-bg);
  border: 1px solid var(--ye-border);
  border-radius: var(--ye-radius-lg);
}
</style>
