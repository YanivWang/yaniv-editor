<template>
  <div ref="rootRef" class="yaniv-editor inline-demo document-layout">
    <div class="inline-demo__body">
      <InlineEditorCard
        :editor="editor"
        :enabled-plugins="enabledPluginViews"
        :has-any-plugin="hasAnyPlugin"
        :stats-text="statsText"
        :enabled-count="enabledCount"
        :total-count="totalCount"
      />
      <InlinePluginPanel
        :plugins="localizedPlugins"
        :toolbar-presets="localizedToolbarPresets"
        :active-toolbar-preset="activeToolbarPreset"
        :enabled-count="enabledCount"
        :total-count="totalCount"
        @toggle-plugin="togglePlugin"
        @toggle-all="toggleAll"
        @apply-preset="applyToolbarPreset"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, toRef } from "vue";

import { useEditorTheme } from "../../src/themes";

import InlineEditorCard from "./inline/InlineEditorCard.vue";
import InlinePluginPanel from "./inline/InlinePluginPanel.vue";
import { useInlineEditor } from "./inline/useInlineEditor";
import { useInlinePlugins } from "./inline/useInlinePlugins";

import type { ThemeMode, ThemePreset } from "../../src/configs/editorConfig";

import "@/styles/variables.css";
import "@/styles/base.css";
import "@/styles/toolbar.css";
import "./inline/inline-demo.css";

const props = withDefaults(
  defineProps<{
    themePreset?: ThemePreset;
    themeMode?: ThemeMode;
  }>(),
  {
    themePreset: "default",
    themeMode: "light",
  },
);

const rootRef = ref<HTMLElement | null>(null);

useEditorTheme({
  rootRef,
  preset: toRef(props, "themePreset"),
  mode: toRef(props, "themeMode"),
});

const { editor, statsText } = useInlineEditor();

const {
  localizedPlugins,
  localizedToolbarPresets,
  enabledPluginViews,
  enabledCount,
  totalCount,
  hasAnyPlugin,
  activeToolbarPreset,
  togglePlugin,
  toggleAll,
  applyToolbarPreset,
} = useInlinePlugins();
</script>
