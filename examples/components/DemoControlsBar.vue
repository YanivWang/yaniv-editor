<template>
  <div class="demo-controls">
    <div class="demo-controls__row">
      <label class="demo-controls__field">
        <span class="demo-controls__label">模式</span>
        <Segmented v-model:value="mode" :options="modeSegmentOptions" size="small" />
      </label>
      <label class="demo-controls__field">
        <span class="demo-controls__label">方案</span>
        <Select
          v-model:value="preset"
          :options="presetSelectOptions"
          size="small"
          style="min-width: 108px"
        />
      </label>
      <label class="demo-controls__field">
        <span class="demo-controls__label">外观</span>
        <Select
          v-model:value="appearance"
          :options="appearanceSelectOptions"
          size="small"
          style="min-width: 108px"
        />
      </label>
      <label class="demo-controls__field">
        <span class="demo-controls__label">颜色</span>
        <Select
          v-model:value="colorMode"
          :options="colorModeSelectOptions"
          size="small"
          style="min-width: 108px"
        />
      </label>
    </div>
    <p v-if="mode === 'preview'" class="demo-controls__hint">
      预览模式：无工具栏与底栏，内容只读；链接可点击，视频可播放。
    </p>
  </div>
</template>

<script setup lang="ts">
import { Segmented, Select } from "ant-design-vue";

import {
  APPEARANCE_OPTIONS,
  COLOR_MODE_OPTIONS,
  MODE_OPTIONS,
  PRESET_OPTIONS,
} from "../config/demoFullEditor";

import type {
  EditorAppearance,
  EditorColorMode,
  EditorMode,
  EditorPreset,
} from "@yanivjs/yaniv-editor";

const mode = defineModel<EditorMode>("mode", { required: true });
const preset = defineModel<EditorPreset>("preset", { required: true });
const appearance = defineModel<EditorAppearance>("appearance", { required: true });
const colorMode = defineModel<EditorColorMode>("colorMode", { required: true });

const modeSegmentOptions = MODE_OPTIONS.map((o) => ({ label: o.label, value: o.value }));
const presetSelectOptions = PRESET_OPTIONS.map((o) => ({ label: o.label, value: o.value }));
const appearanceSelectOptions = APPEARANCE_OPTIONS.map((o) => ({ label: o.label, value: o.value }));
const colorModeSelectOptions = COLOR_MODE_OPTIONS.map((o) => ({ label: o.label, value: o.value }));
</script>
