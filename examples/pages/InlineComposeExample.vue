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
      <InlineComposeDemoCore
        v-model:content="html"
        :toolbar="toolbar"
        :mode="inlineMode"
        :color-mode="colorMode"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

import "@yanivjs/yaniv-editor/inline.css";

import DemoInlinePanel from "../components/DemoInlinePanel.vue";
import DemoSidebar from "../components/DemoSidebar.vue";
import DemoSubnav from "../components/DemoSubnav.vue";
import InlineComposeDemoCore from "../components/InlineComposeDemoCore.vue";
import { getDemoEntry } from "../config/demoCatalog";
import { INLINE_FULL_TOOLBAR } from "../config/demoInline";

import type { EditorColorMode, EditorMode } from "@yanivjs/yaniv-editor";
import type { InlineToolbarConfig } from "@yanivjs/yaniv-editor/inline";

const entry = getDemoEntry("inline-compose");

const html = ref(
  '<h2>行内自行拼装</h2><p>自管 <code>Editor</code> 生命周期，按需挂载工具栏组件；扩展由 <code>buildExtensions("inline", ctx)</code> 与 toolbar 同步。</p>',
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
</style>
