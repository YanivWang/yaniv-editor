<template>
  <div class="demo-inline-panel">
    <div class="demo-inline-panel__head">
      <span class="demo-inline-panel__title">行内配置</span>
    </div>
    <div class="demo-inline-panel__row">
      <span class="demo-inline-panel__field-label">模式</span>
      <Segmented v-model:value="mode" :options="INLINE_MODE_OPTIONS" size="small" />
    </div>
    <div class="demo-inline-panel__row">
      <span class="demo-inline-panel__field-label">颜色</span>
      <Segmented v-model:value="colorMode" :options="COLOR_MODE_OPTIONS" size="small" />
    </div>
    <div class="demo-inline-panel__toggles">
      <label
        v-for="item in INLINE_TOOLBAR_TOGGLES"
        :key="item.key"
        class="demo-inline-panel__check"
      >
        <Checkbox v-model:checked="toolbarEnabled[item.key]" />
        <span>{{ item.label }}</span>
      </label>
    </div>
    <ul class="demo-inline-panel__hints">
      <li v-for="h in INLINE_HINTS" :key="h.id">
        <strong>{{ h.label }}：</strong>{{ h.hint }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { Checkbox, Segmented } from "ant-design-vue";
import { reactive, watch } from "vue";

import { COLOR_MODE_OPTIONS } from "../config/demoFullEditor";
import {
  buildInlineToolbar,
  INLINE_HINTS,
  INLINE_MODE_OPTIONS,
  INLINE_TOOLBAR_TOGGLES,
} from "../config/demoInline";

import type { EditorColorMode, EditorMode } from "@yanivjs/yaniv-editor";
import type { InlineToolbarConfig } from "@yanivjs/yaniv-editor/inline";

const mode = defineModel<EditorMode>("mode", { required: true });
const toolbar = defineModel<InlineToolbarConfig>("toolbar", { required: true });
const colorMode = defineModel<EditorColorMode>("colorMode", { required: true });

const toolbarEnabled = reactive(
  Object.fromEntries(
    INLINE_TOOLBAR_TOGGLES.map((t) => [t.key, toolbar.value[t.key] === true]),
  ) as Record<keyof InlineToolbarConfig, boolean>,
);

watch(
  toolbarEnabled,
  () => {
    toolbar.value = buildInlineToolbar(toolbarEnabled);
  },
  { deep: true },
);

watch(
  toolbar,
  (next) => {
    for (const { key } of INLINE_TOOLBAR_TOGGLES) {
      toolbarEnabled[key] = next[key] === true;
    }
  },
  { deep: true },
);
</script>
