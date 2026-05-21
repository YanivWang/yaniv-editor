<template>
  <div class="demo-page demo-page--inline">
    <DemoSubnav title="行内自行拼装" :description="entry?.description" />
    <div class="demo-page--inline__panel">
      <DemoInlinePanel v-model:mode="inlineMode" v-model:toolbar="toolbar" />
    </div>
    <InlineComposeDemoCore :key="composeKey" :toolbar="toolbar" :mode="inlineMode" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

import type { InlineToolbarConfig } from "@/configs/inlineTypes";
import type { EditorMode } from "@/core/editorTypes";

import "@yanivjs/yaniv-editor/inline.css";

import DemoInlinePanel from "../components/DemoInlinePanel.vue";
import DemoSubnav from "../components/DemoSubnav.vue";
import InlineComposeDemoCore from "../components/InlineComposeDemoCore.vue";
import { getDemoEntry } from "../config/demoCatalog";
import { inlineToolbarKey, INLINE_FULL_TOOLBAR } from "../config/demoInline";

const entry = getDemoEntry("inline-compose");

const inlineMode = ref<EditorMode>("edit");
const toolbar = ref<InlineToolbarConfig>({ ...INLINE_FULL_TOOLBAR });

const composeKey = computed(() => inlineToolbarKey(toolbar.value, inlineMode.value));
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
</style>
