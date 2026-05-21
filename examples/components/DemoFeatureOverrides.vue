<template>
  <div class="demo-overrides">
    <div class="demo-overrides__head">
      <span class="demo-overrides__title">features 覆盖</span>
      <span class="demo-overrides__sub">覆盖当前 preset 的能力开关，对应 :features prop</span>
    </div>
    <div class="demo-overrides__grid">
      <label v-for="item in FEATURE_OVERRIDE_ITEMS" :key="item.key" class="demo-overrides__item">
        <span class="demo-overrides__label">{{ item.label }}</span>
        <Select
          v-model:value="state[item.key]"
          :options="OVERRIDE_MODE_OPTIONS"
          size="small"
          style="width: 96px"
        />
      </label>
    </div>
    <pre v-if="featuresSnippet" class="demo-overrides__code">{{ featuresSnippet }}</pre>
  </div>
</template>

<script setup lang="ts">
import { Select } from "ant-design-vue";
import { computed } from "vue";

import {
  buildFeatureConfig,
  FEATURE_OVERRIDE_ITEMS,
  OVERRIDE_MODE_OPTIONS,
  type FeatureOverrideState,
} from "../config/demoFeatureOverrides";

const state = defineModel<FeatureOverrideState>("state", { required: true });

const featuresSnippet = computed(() => {
  const config = buildFeatureConfig(state.value);
  if (!config) return "";
  return `:features="${JSON.stringify(config, null, 2)}"`;
});
</script>
