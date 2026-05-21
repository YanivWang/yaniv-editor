<template>
  <div class="demo-multi-panel">
    <section class="demo-multi-panel__section">
      <h3 class="demo-multi-panel__title">编辑器 A</h3>
      <div class="demo-multi-panel__row">
        <label class="demo-multi-panel__field">
          <span>语言</span>
          <Segmented v-model:value="localeA" :options="localeOptions" size="small" />
        </label>
        <label class="demo-multi-panel__field">
          <span>外观</span>
          <Select
            v-model:value="appearanceA"
            :options="appearanceOptions"
            size="small"
            style="min-width: 108px"
          />
        </label>
        <label class="demo-multi-panel__field">
          <span>颜色</span>
          <Select
            v-model:value="colorModeA"
            :options="colorModeOptions"
            size="small"
            style="min-width: 108px"
          />
        </label>
      </div>
      <p class="demo-multi-panel__probe">
        探测：<code>data-color-mode={{ probeA.colorMode ?? "—" }}</code> ·
        <code>--ye-primary={{ probeA.primary ?? "—" }}</code>
      </p>
    </section>

    <section class="demo-multi-panel__section">
      <h3 class="demo-multi-panel__title">编辑器 B</h3>
      <div class="demo-multi-panel__row">
        <label class="demo-multi-panel__field">
          <span>语言</span>
          <Segmented v-model:value="localeB" :options="localeOptions" size="small" />
        </label>
        <label class="demo-multi-panel__field">
          <span>外观</span>
          <Select
            v-model:value="appearanceB"
            :options="appearanceOptions"
            size="small"
            style="min-width: 108px"
          />
        </label>
        <label class="demo-multi-panel__field">
          <span>颜色</span>
          <Select
            v-model:value="colorModeB"
            :options="colorModeOptions"
            size="small"
            style="min-width: 108px"
          />
        </label>
      </div>
      <p class="demo-multi-panel__probe">
        探测：<code>data-color-mode={{ probeB.colorMode ?? "—" }}</code> ·
        <code>--ye-primary={{ probeB.primary ?? "—" }}</code>
      </p>
    </section>

    <p class="demo-multi-panel__hint">
      验收要点：只改「编辑器 A」的控制项时，B 的根节点 <code>data-color-mode</code> 与
      <code>--ye-primary</code> 不应变化；切换语言时仅对应栏顶栏文案变化。
    </p>
  </div>
</template>

<script setup lang="ts">
import { Segmented, Select } from "ant-design-vue";

import { APPEARANCE_OPTIONS, COLOR_MODE_OPTIONS } from "../config/demoFullEditor";

import type { EditorAppearance, EditorColorMode } from "@yanivjs/yaniv-editor";

export interface MultiInstanceProbe {
  colorMode: string | null;
  primary: string | null;
}

const localeA = defineModel<"zh-CN" | "en-US">("localeA", { required: true });
const localeB = defineModel<"zh-CN" | "en-US">("localeB", { required: true });
const appearanceA = defineModel<EditorAppearance>("appearanceA", { required: true });
const appearanceB = defineModel<EditorAppearance>("appearanceB", { required: true });
const colorModeA = defineModel<EditorColorMode>("colorModeA", { required: true });
const colorModeB = defineModel<EditorColorMode>("colorModeB", { required: true });

defineProps<{
  probeA: MultiInstanceProbe;
  probeB: MultiInstanceProbe;
}>();

const localeOptions = [
  { label: "中文", value: "zh-CN" },
  { label: "English", value: "en-US" },
];

const appearanceOptions = APPEARANCE_OPTIONS.map((o) => ({ label: o.label, value: o.value }));
const colorModeOptions = COLOR_MODE_OPTIONS.map((o) => ({ label: o.label, value: o.value }));
</script>

<style scoped>
.demo-multi-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 12px;
}

.demo-multi-panel__section {
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.demo-multi-panel__title {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.demo-multi-panel__row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.demo-multi-panel__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #64748b;
}

.demo-multi-panel__probe {
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.5;
  color: #475569;
}

.demo-multi-panel__probe code {
  font-size: 11px;
}

.demo-multi-panel__hint {
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.55;
  color: #475569;
  background: #eff6ff;
  border-radius: 8px;
}
</style>
