<template>
  <a-config-provider :theme="antdTheme">
    <div
      class="demo-app inline-mode"
      :class="[`theme-${themePreset}`]"
      :data-theme="resolvedShellTheme"
    >
      <DemoAppHeader
        subtitle-key="demo.subtitle.inlinePlugins"
        :theme-mode="themeMode"
        :theme-preset="themePreset"
        show-theme-mode
        show-theme-preset
        @update:theme-mode="themeMode = $event"
        @update:theme-preset="themePreset = $event"
      />

      <main class="demo-main demo-main--inline">
        <InlinePluginDemo :theme-preset="themePreset" :theme-mode="themeMode" />
      </main>
    </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import { theme as antTheme } from "ant-design-vue";
import { computed, onMounted, ref } from "vue";

import { registerTheme, useResolvedThemeMode } from "../../src/themes";
import DemoAppHeader from "../components/DemoAppHeader.vue";
import InlinePluginDemo from "../components/InlinePluginDemo.vue";

import type { ThemeMode, ThemePreset } from "../../src/configs/editorConfig";

const themeMode = ref<ThemeMode>("light");
const themePreset = ref<ThemePreset>("default");

const resolvedShellTheme = useResolvedThemeMode(themeMode);

const antdTheme = computed(() => ({
  algorithm:
    resolvedShellTheme.value === "dark" ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
}));

onMounted(() => {
  registerTheme("custom", {
    "--tiptap-primary": "#6366f1",
    "--tiptap-primary-hover": "#4f46e5",
    "--tiptap-bg": "#faf5ff",
    "--tiptap-bg-secondary": "#f3e8ff",
    "--tiptap-text": "#1e1b4b",
    "--tiptap-border": "#c4b5fd",
  });
});
</script>

<style scoped>
@import "../styles/example-shell.css";
</style>
