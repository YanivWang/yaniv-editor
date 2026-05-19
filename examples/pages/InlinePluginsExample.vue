<template>
  <div class="demo-app inline-mode" :data-theme="theme">
    <DemoAppHeader
      subtitle-key="demo.subtitle.inlinePlugins"
      :theme="theme"
      @toggle-theme="toggleTheme"
    />

    <main class="demo-main demo-main--inline">
      <InlinePluginDemo :theme="theme" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

import DemoAppHeader from "../components/DemoAppHeader.vue";
import InlinePluginDemo from "../components/InlinePluginDemo.vue";

const theme = ref<"light" | "dark">("light");

const toggleTheme = () => {
  theme.value = theme.value === "light" ? "dark" : "light";
};
</script>

<style scoped>
@import "../styles/example-shell.css";
</style>
