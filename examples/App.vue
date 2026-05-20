<template>
  <div class="demo-app">
    <header class="demo-nav">
      <RouterLink class="demo-nav__brand" :to="{ name: 'full-editor' }">Yaniv Editor</RouterLink>
      <nav class="demo-nav__links">
        <RouterLink :to="{ name: 'full-editor' }">完整编辑器</RouterLink>
        <RouterLink :to="{ name: 'inline-plugins' }">行内拼装</RouterLink>
      </nav>
    </header>
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
</script>

<style>
@import "./styles/example-shell.css";

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

body {
  min-height: 100vh;
}
</style>
