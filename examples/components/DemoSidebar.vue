<template>
  <aside class="demo-sidebar" :class="{ 'demo-sidebar--collapsed': collapsed }">
    <button
      v-if="collapsed"
      type="button"
      class="demo-sidebar__toggle"
      aria-label="展开配置面板"
      title="展开配置"
      @click="toggle"
    >
      <span class="demo-sidebar__toggle-icon" aria-hidden="true">›</span>
    </button>
    <div v-show="!collapsed" class="demo-sidebar__content">
      <slot />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { onMounted, provide, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    /** sessionStorage 键；传入则刷新后保持折叠状态 */
    storageKey?: string;
    /** 初始是否收起 */
    defaultCollapsed?: boolean;
  }>(),
  {
    defaultCollapsed: false,
  },
);

const collapsed = ref(props.defaultCollapsed);

function readStored(): boolean | null {
  if (!props.storageKey) return null;
  try {
    const raw = sessionStorage.getItem(props.storageKey);
    if (raw === "1") return true;
    if (raw === "0") return false;
  } catch {
    /* ignore */
  }
  return null;
}

function persist(value: boolean) {
  if (!props.storageKey) return;
  try {
    sessionStorage.setItem(props.storageKey, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

onMounted(() => {
  const stored = readStored();
  if (stored !== null) collapsed.value = stored;
});

watch(collapsed, (value) => persist(value));

function toggle() {
  collapsed.value = !collapsed.value;
}

provide("demoSidebar", { collapsed, toggle });
</script>
