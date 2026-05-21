<template>
  <div class="demo-page demo-page--home">
    <header class="demo-home__header">
      <h1 class="demo-home__title">Yaniv Editor 示例</h1>
      <p class="demo-home__lead">
        选择一种接入方式进入演示。「多实例隔离」页并排两个编辑器，用于验收 locale / appearance
        互不影响。
      </p>
    </header>
    <div class="demo-home__grid">
      <RouterLink
        v-for="entry in DEMO_ENTRIES"
        :key="entry.id"
        class="demo-home__card"
        :to="{ name: entry.routeName }"
      >
        <h2 class="demo-home__card-title">{{ entry.title }}</h2>
        <p class="demo-home__card-desc">{{ entry.description }}</p>
        <ul class="demo-home__highlights">
          <li v-for="(line, i) in entry.highlights" :key="i">{{ line }}</li>
        </ul>
        <div class="demo-home__tags">
          <span v-for="tag in entry.tags" :key="tag" class="demo-home__tag">{{ tag }}</span>
        </div>
        <span class="demo-home__cta">进入演示 →</span>
      </RouterLink>
    </div>
    <DemoAdvancedPanel />
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";

import DemoAdvancedPanel from "../components/DemoAdvancedPanel.vue";
import { DEMO_ENTRIES } from "../config/demoCatalog";
</script>
