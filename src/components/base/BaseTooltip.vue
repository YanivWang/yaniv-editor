<template>
  <div
    class="ye-tooltip-wrapper"
    @mouseenter="showTooltip = true"
    @mouseleave="showTooltip = false"
    @focus="showTooltip = true"
    @blur="showTooltip = false"
  >
    <slot />
    <Transition name="ye-tooltip-fade">
      <div v-if="showTooltip && title" class="ye-tooltip" :class="`ye-tooltip--${placement}`">
        {{ title }}
        <div class="ye-tooltip__arrow" />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

interface Props {
  title?: string;
  placement?: "top" | "bottom" | "left" | "right";
}

withDefaults(defineProps<Props>(), {
  placement: "top",
});

const showTooltip = ref(false);
</script>

<style scoped>
.ye-tooltip-wrapper {
  position: relative;
  display: inline-flex;
}

.ye-tooltip {
  position: absolute;
  z-index: var(--ye-z-bubble);
  padding: 6px 10px;
  font-size: 12px;
  line-height: 1.4;
  color: #fff;
  white-space: nowrap;
  pointer-events: none;
  background: rgba(0, 0, 0, 0.85);
  border-radius: var(--ye-radius-sm);
}

.ye-tooltip--top {
  bottom: 100%;
  left: 50%;
  margin-bottom: 8px;
  transform: translateX(-50%);
}

.ye-tooltip--bottom {
  top: 100%;
  left: 50%;
  margin-top: 8px;
  transform: translateX(-50%);
}

.ye-tooltip--left {
  top: 50%;
  right: 100%;
  margin-right: 8px;
  transform: translateY(-50%);
}

.ye-tooltip--right {
  top: 50%;
  left: 100%;
  margin-left: 8px;
  transform: translateY(-50%);
}

.ye-tooltip__arrow {
  position: absolute;
  width: 0;
  height: 0;
  border: 4px solid transparent;
}

.ye-tooltip--top .ye-tooltip__arrow {
  top: 100%;
  left: 50%;
  border-top-color: rgba(0, 0, 0, 0.85);
  transform: translateX(-50%);
}

.ye-tooltip--bottom .ye-tooltip__arrow {
  bottom: 100%;
  left: 50%;
  border-bottom-color: rgba(0, 0, 0, 0.85);
  transform: translateX(-50%);
}

/* Transitions */
.ye-tooltip-fade-enter-active,
.ye-tooltip-fade-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.ye-tooltip-fade-enter-from,
.ye-tooltip-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
}
</style>
