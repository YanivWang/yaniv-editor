<template>
  <div class="demo-page demo-page--split">
    <DemoSidebar storage-key="yaniv-demo:sidebar:inline-compose">
      <DemoSubnav title="行内自行拼装" :description="entry?.description" />
      <div class="demo-sidebar__body">
        <div class="demo-inline-panel-wrapper">
          <DemoInlinePanel
            v-model:mode="inlineMode"
            v-model:toolbar="toolbar"
            v-model:color-mode="colorMode"
          />
        </div>
      </div>
    </DemoSidebar>
    <main class="demo-main demo-main--centered">
      <YanivInlineEditor
        v-model:content="html"
        :mode="inlineMode"
        :toolbar="toolbar"
        :color-mode="colorMode"
        class="demo-inline"
        placeholder="写点什么…"
      >
        <template #toolbar="{ editor, config }">
          <div v-if="editor && config" class="demo-inline__toolbar">
            <UndoRedoButton v-if="config.undoRedo" :editor="editor" />
            <HeadingControl v-if="config.heading" variant="dropdown" :editor="editor" />
            <TextFormatButtons v-if="config.textFormat" :editor="editor" />
            <ListTools v-if="config.list" :editor="editor" :show-task-list="true" />
            <AlignDropdown v-if="config.align" :editor="editor" />
            <LinkButton v-if="config.link" :editor="editor" />
            <ClearFormatButton v-if="config.clearFormat" :editor="editor" />
            <template v-if="config.font">
              <FontSizeSelect :editor="editor" />
              <FontFamilySelect :editor="editor" />
            </template>
            <CodeBlockDropdown v-if="config.codeBlock" :editor="editor" />
          </div>
        </template>
      </YanivInlineEditor>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

import {
  AlignDropdown,
  ClearFormatButton,
  CodeBlockDropdown,
  FontFamilySelect,
  FontSizeSelect,
  HeadingControl,
  LinkButton,
  ListTools,
  TextFormatButtons,
  UndoRedoButton,
  YanivInlineEditor,
} from "@yanivjs/yaniv-editor/inline";

import "@yanivjs/yaniv-editor/inline.css";

import DemoInlinePanel from "../components/DemoInlinePanel.vue";
import DemoSidebar from "../components/DemoSidebar.vue";
import DemoSubnav from "../components/DemoSubnav.vue";
import { getDemoEntry } from "../config/demoCatalog";
import { INLINE_FULL_TOOLBAR } from "../config/demoInline";

import type { EditorColorMode, EditorMode } from "@yanivjs/yaniv-editor";

const entry = getDemoEntry("inline-compose");

const html = ref(
  "<h2>行内自行拼装</h2><p>通过 <code>YanivInlineEditor</code> 的 <code>#toolbar</code> 插槽按需挂载按钮；扩展仍由 <code>toolbar</code> 配置驱动，与开箱即用页一致。</p>",
);
const inlineMode = ref<EditorMode>("edit");
const toolbar = ref({ ...INLINE_FULL_TOOLBAR });
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

.demo-inline__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  padding: 8px 12px;
  background: var(--ye-toolbar-bg);
  border-bottom: 1px solid var(--ye-border);
}
</style>
