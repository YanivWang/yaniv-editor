<template>
  <div class="demo-subnav">
    <div class="demo-subnav__toolbar">
      <RouterLink class="demo-subnav__back" :to="{ name: 'home' }">← 返回示例总览</RouterLink>
      <button
        v-if="sidebar"
        type="button"
        class="demo-subnav__collapse"
        aria-label="收起配置面板"
        title="收起配置"
        @click="sidebar.toggle()"
      >
        收起
      </button>
    </div>
    <div v-if="title" class="demo-subnav__meta">
      <h2 class="demo-subnav__title">{{ title }}</h2>
      <p v-if="description" class="demo-subnav__desc">{{ description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from "vue";
import { RouterLink } from "vue-router";

defineProps<{
  title?: string;
  description?: string;
}>();

type DemoSidebarContext = {
  collapsed: { value: boolean };
  toggle: () => void;
};

const sidebar = inject<DemoSidebarContext | null>("demoSidebar", null);
</script>
