<template>
  <div class="inline-demo__panel">
    <div class="plugin-panel">
      <div class="plugin-panel__header">
        <h3 class="plugin-panel__title">{{ t("demo.inline.panel.title") }}</h3>
        <div class="plugin-panel__actions">
          <button
            class="plugin-panel__btn"
            :class="{ 'plugin-panel__btn--active': enabledCount === totalCount }"
            @click="emit('toggleAll', true)"
          >
            {{ t("demo.inline.panel.allOn") }}
          </button>
          <button
            class="plugin-panel__btn"
            :class="{ 'plugin-panel__btn--active': enabledCount === 0 }"
            @click="emit('toggleAll', false)"
          >
            {{ t("demo.inline.panel.allOff") }}
          </button>
        </div>
      </div>

      <div class="plugin-panel__presets">
        <button
          v-for="preset in toolbarPresets"
          :key="preset.id"
          class="preset-btn"
          :class="{ 'preset-btn--active': activeToolbarPreset === preset.id }"
          @click="emit('applyPreset', preset)"
        >
          <span class="preset-btn__icon">{{ preset.icon }}</span>
          <span class="preset-btn__label">{{ preset.label }}</span>
        </button>
      </div>

      <div class="plugin-panel__list">
        <div
          v-for="plugin in plugins"
          :key="plugin.id"
          class="plugin-item"
          :class="{ 'plugin-item--enabled': plugin.enabled }"
          @click="emit('togglePlugin', plugin.id)"
        >
          <div class="plugin-item__info">
            <span class="plugin-item__icon" :style="{ background: plugin.color }">
              <component :is="plugin.iconComponent" v-if="plugin.iconComponent" />
              <span v-else v-html="plugin.iconSvg"></span>
            </span>
            <div class="plugin-item__text">
              <span class="plugin-item__name">{{ plugin.name }}</span>
              <span class="plugin-item__desc">{{ plugin.description }}</span>
            </div>
          </div>
          <div class="plugin-item__toggle" :class="{ 'is-on': plugin.enabled }">
            <div class="plugin-item__toggle-track">
              <div class="plugin-item__toggle-thumb"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { t } from "../../../src/locales";

import type { InlineToolbarPluginView, InlineToolbarPresetView } from "./types";

defineProps<{
  plugins: InlineToolbarPluginView[];
  toolbarPresets: InlineToolbarPresetView[];
  activeToolbarPreset: string;
  enabledCount: number;
  totalCount: number;
}>();

const emit = defineEmits<{
  togglePlugin: [id: string];
  toggleAll: [enabled: boolean];
  applyPreset: [preset: InlineToolbarPresetView];
}>();
</script>
