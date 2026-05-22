<template>
  <a-tooltip :title="title" placement="top">
    <button
      :class="[
        'ye-toolbar-button',
        `ye-toolbar-button--${size}`,
        { 'is-active': active, 'is-danger': danger },
      ]"
      :disabled="disabled"
      type="button"
      @mousedown.prevent
      @click="onClick"
      @dblclick="onDblClick"
    >
      <span class="ye-toolbar-button__content">
        <slot name="icon">
          <component :is="icon" v-if="icon" />
        </slot>
        <slot />
      </span>
    </button>
  </a-tooltip>
</template>

<script setup lang="ts">
import { Tooltip as ATooltip } from "ant-design-vue";

import type { Component } from "vue";

interface Props {
  icon?: Component;
  title: string;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  size?: "small" | "medium" | "large";
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
  disabled: false,
  danger: false,
  size: "medium",
});

const emit = defineEmits<{ (e: "click"): void; (e: "dblclick"): void }>();

function onClick() {
  if (props.disabled) return;
  emit("click");
}

function onDblClick() {
  if (props.disabled) return;
  emit("dblclick");
}
</script>

<style>
/* 使用全局样式以支持深色模式（因为需要匹配父级的 data-color-mode 属性） */
.ye-toolbar-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  padding: 0 6px;
  line-height: 1;
  color: var(--ye-toolbar-btn-text);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--ye-radius-sm);
  transition: all var(--ye-transition-normal);
}

.ye-toolbar-button:disabled {
  color: var(--ye-toolbar-btn-disabled);
  cursor: not-allowed;
  opacity: 0.5;
}

.ye-toolbar-button--small {
  height: 28px;
}

.ye-toolbar-button--medium {
  height: 32px;
}

.ye-toolbar-button--large {
  height: 36px;
}

.ye-toolbar-button:hover:not(:disabled) {
  color: var(--ye-text);
  background: var(--ye-toolbar-btn-hover);
}

.ye-toolbar-button:active:not(:disabled) {
  color: var(--ye-text);
  background: var(--ye-toolbar-btn-active);
}

.ye-toolbar-button.is-active {
  font-weight: 500;
  color: var(--ye-primary);
  background: var(--ye-primary-light);
}

.ye-toolbar-button.is-active:hover:not(:disabled) {
  color: var(--ye-primary);
  background: var(--ye-primary-light);
}

.ye-toolbar-button.is-danger {
  color: var(--ye-danger);
}

.ye-toolbar-button.is-danger:hover:not(:disabled) {
  color: #fff;
  background: var(--ye-danger);
}

.ye-toolbar-button__content {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.ye-toolbar-button__content .anticon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  line-height: 1;
}
</style>
