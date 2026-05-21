<template>
  <div class="demo-subnav">
    <RouterLink class="demo-subnav__back" :to="{ name: 'home' }">← 返回示例总览</RouterLink>
    <div v-if="title" class="demo-subnav__meta">
      <h2 class="demo-subnav__title">{{ title }}</h2>
      <p v-if="description" class="demo-subnav__desc">{{ description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";

defineProps<{
  title?: string;
  description?: string;
}>();
</script>
