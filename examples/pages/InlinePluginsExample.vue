<template>
  <div class="demo-app inline-mode" :data-theme="theme">
    <header class="demo-header">
      <div class="demo-header__content">
        <RouterLink class="demo-header__title" :to="{ name: 'home' }">
          <span class="demo-header__icon">T</span>
          yaniv-editor Examples
        </RouterLink>
        <p class="demo-header__subtitle">Inline editor with hot-swappable feature plugins</p>
      </div>

      <div class="demo-header__actions">
        <nav class="demo-mode-switcher" aria-label="Examples">
          <RouterLink class="demo-mode-btn" :to="{ name: 'full-editor' }"> Full Editor </RouterLink>
          <RouterLink class="demo-mode-btn" :to="{ name: 'inline-plugins' }">
            Inline + Plugins
          </RouterLink>
        </nav>

        <button
          class="demo-theme-toggle"
          :title="theme === 'light' ? 'Switch to Dark' : 'Switch to Light'"
          @click="toggleTheme"
        >
          {{ theme === "light" ? "Dark" : "Light" }}
        </button>
      </div>
    </header>

    <main class="demo-main demo-main--inline">
      <InlinePluginDemo :theme="theme" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";

import InlinePluginDemo from "../components/InlinePluginDemo.vue";

const theme = ref<"light" | "dark">("light");

const toggleTheme = () => {
  theme.value = theme.value === "light" ? "dark" : "light";
};
</script>

<style scoped>
@import "../styles/example-shell.css";
</style>
