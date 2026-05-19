<template>
  <div class="demo-app inline-mode" :data-theme="resolvedShellTheme">
    <DemoAppHeader
      subtitle-key="demo.subtitle.inlinePlugins"
      :theme="resolvedShellTheme"
      @toggle-theme="toggleTheme"
    />

    <main class="demo-main demo-main--inline">
      <InlinePluginDemo :theme="resolvedShellTheme" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

import { useResolvedThemeMode } from "../../src/themes";
import DemoAppHeader from "../components/DemoAppHeader.vue";
import InlinePluginDemo from "../components/InlinePluginDemo.vue";

import type { ThemeMode } from "../../src/configs/editorConfig";

const themeMode = ref<ThemeMode>("light");
const resolvedShellTheme = useResolvedThemeMode(themeMode);

const toggleTheme = () => {
  themeMode.value = resolvedShellTheme.value === "light" ? "dark" : "light";
};
</script>

<style scoped>
@import "../styles/example-shell.css";
</style>
