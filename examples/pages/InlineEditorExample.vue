<template>
  <div class="demo-page demo-page--split">
    <aside class="demo-sidebar">
      <DemoSubnav title="行内编辑器" :description="entry?.description" />
      <div class="demo-sidebar__body">
        <div class="demo-inline-panel-wrapper">
          <DemoInlinePanel
            v-model:mode="inlineMode"
            v-model:toolbar="toolbar"
            v-model:color-mode="colorMode"
          />
        </div>
      </div>
    </aside>
    <main class="demo-main demo-main--centered">
      <YanivInlineEditor
        v-model:content="html"
        :mode="inlineMode"
        :toolbar="toolbar"
        :color-mode="colorMode"
        class="demo-inline"
        placeholder="写一条评论…"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

import type { EditorColorMode } from "@/configs/editorConfig";
import type { InlineToolbarConfig } from "@/configs/inlineTypes";
import type { EditorMode } from "@/core/editorTypes";

import { YanivInlineEditor } from "@yanivjs/yaniv-editor/inline";

import "@yanivjs/yaniv-editor/inline.css";

import DemoInlinePanel from "../components/DemoInlinePanel.vue";
import DemoSubnav from "../components/DemoSubnav.vue";
import { getDemoEntry } from "../config/demoCatalog";
import { INLINE_FULL_TOOLBAR } from "../config/demoInline";

const entry = getDemoEntry("inline-editor");

const html = ref(
  "<p>开箱即用：<code>YanivInlineEditor</code> + toolbar，扩展与工具栏自动同步。</p>",
);

const inlineMode = ref<EditorMode>("edit");
const toolbar = ref<InlineToolbarConfig>({ ...INLINE_FULL_TOOLBAR });
const colorMode = ref<EditorColorMode>("light");
</script>

<style scoped>
.demo-main--centered {
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.demo-inline-panel-wrapper {
  padding: 12px;
}

.demo-main :deep(.demo-inline) {
  width: 100%;
  max-width: 720px;
  overflow: hidden;
  background: var(--ye-bg);
  border: 1px solid var(--ye-border);
  border-radius: var(--ye-radius-lg);
}
</style>
