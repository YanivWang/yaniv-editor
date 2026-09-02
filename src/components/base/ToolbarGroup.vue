<template>
  <div :class="['toolbar-group', `toolbar-group--${direction}`]" :style="groupStyle">
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * 工具栏分组容器：只负责排列方向与间距。
 *
 * **分割线不归它管。** 曾经有一组 `divider` / `dividerColor` prop 和一个
 * `ToolbarDivider.vue` 组件，但全仓没有任何调用点传过 `divider`——
 * 那个 `v-if` 恒为假，组件、`dividerDirection`、`computedDividerColor`
 * 连同只有一行注释、没有任何声明的 `.toolbar-group--with-divider` 全是死的。
 * 项目实际用的是 `ToolbarNav` 里的 `border-left: … var(--ye-toolbar-divider)`。
 */
import { computed } from "vue";

interface Props {
  direction?: "horizontal" | "vertical";
  gap?: number;
}

const props = withDefaults(defineProps<Props>(), {
  direction: "horizontal",
  gap: 4,
});

const groupStyle = computed(() => ({
  gap: `${props.gap}px`,
}));
</script>

<style scoped>
.toolbar-group {
  display: inline-flex;
  align-items: center;
}

.toolbar-group--horizontal {
  flex-direction: row;
}

.toolbar-group--vertical {
  flex-direction: column;
}
</style>
