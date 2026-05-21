<template>
  <div class="demo-app">
    <header class="demo-nav">
      <RouterLink class="demo-nav__brand" :to="{ name: 'home' }">Yaniv Editor</RouterLink>
      <nav class="demo-nav__links">
        <RouterLink :to="{ name: 'home' }">示例总览</RouterLink>
        <RouterLink :to="{ name: 'full-editor' }">完整编辑器</RouterLink>
        <RouterLink :to="{ name: 'inline-editor' }">行内编辑器</RouterLink>
        <RouterLink :to="{ name: 'inline-compose' }">行内自行拼装</RouterLink>
        <RouterLink :to="{ name: 'multi-instance' }">多实例隔离</RouterLink>
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
</style>
