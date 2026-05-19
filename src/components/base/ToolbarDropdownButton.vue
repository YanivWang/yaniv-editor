<template>
  <a-dropdown v-model:open="dropdownOpen" :placement="placement" :trigger="['click']">
    <a-tooltip :title="title" placement="top" :open="dropdownOpen ? false : undefined">
      <a-button type="text" :class="['ye-dropdown-btn', { 'is-active': active }]">
        <span class="ye-dropdown-btn__content">
          <component :is="icon" v-if="icon" class="ye-dropdown-btn__icon" />
          <span v-if="label" class="ye-dropdown-btn__label">{{ label }}</span>
          <DownOutlined class="ye-dropdown-btn__arrow" />
        </span>
      </a-button>
    </a-tooltip>

    <template #overlay>
      <a-menu style="max-height: 360px; overflow-y: auto" @click="onMenuClick">
        <template v-for="item in items" :key="item.key">
          <a-menu-divider v-if="item.type === 'divider'" />

          <a-sub-menu
            v-else-if="item.children && item.children.length"
            :key="item.key + ':submenu'"
          >
            <template #title>
              <span class="ye-dropdown-menu-item">
                <component :is="item.icon" v-if="item.icon" class="ye-dropdown-menu-item__icon" />
                <span class="ye-dropdown-menu-item__label">{{ item.label }}</span>
              </span>
            </template>
            <a-menu-item
              v-for="child in item.children"
              :key="child.key"
              :disabled="child.disabled"
              :danger="child.danger"
            >
              <span class="ye-dropdown-menu-item">
                <component :is="child.icon" v-if="child.icon" class="ye-dropdown-menu-item__icon" />
                <span class="ye-dropdown-menu-item__label">{{ child.label }}</span>
              </span>
            </a-menu-item>
          </a-sub-menu>

          <a-menu-item
            v-else-if="item.type !== 'divider'"
            :key="item.key"
            :disabled="item.disabled"
            :danger="item.danger"
            :class="{ 'ant-menu-item-selected': item.active }"
          >
            <span class="ye-dropdown-menu-item">
              <component :is="item.icon" v-if="item.icon" class="ye-dropdown-menu-item__icon" />
              <span class="ye-dropdown-menu-item__label">{{ item.label }}</span>
            </span>
          </a-menu-item>
        </template>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<script setup lang="ts">
import { DownOutlined } from "@ant-design/icons-vue";
import { Tooltip as ATooltip } from "ant-design-vue";
import { ref } from "vue";

import type { MenuItemConfig } from "@/configs/toolbarTypes";

import type { Component } from "vue";

const dropdownOpen = ref(false);

interface Props {
  icon?: Component;
  label?: string;
  title?: string;
  active?: boolean;
  items: MenuItemConfig[];
  placement?: "top" | "bottom" | "bottomLeft" | "bottomRight" | "topLeft" | "topRight";
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
  placement: "bottom",
});

const emit = defineEmits<{ select: [key: string] }>();

function findItemByKey(items: MenuItemConfig[], key: string): MenuItemConfig | undefined {
  for (const item of items) {
    if (item.key === key) return item;
    if (item.children?.length) {
      const found = findItemByKey(item.children, key);
      if (found) return found;
    }
  }
  return undefined;
}

function onMenuClick(info: { key: string }) {
  const item = findItemByKey(props.items, info.key);
  if (!item) return;
  dropdownOpen.value = false;
  item.action?.();
  emit("select", info.key);
}
</script>

<style>
/* 使用全局样式以支持深色模式 */
@media (width <= 768px) {
  .ye-dropdown-btn {
    height: 28px;
    padding: 0 6px;
  }
  .ye-dropdown-btn__icon {
    font-size: 14px;
  }
  .ye-dropdown-btn__label {
    font-size: 12px;
  }
}

.ye-dropdown-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 6px;
  line-height: 1;
  color: var(--tiptap-toolbar-btn-text);
  border-radius: var(--tiptap-radius-sm);
  transition: all var(--tiptap-transition-normal);
}

.ye-dropdown-btn:hover {
  color: var(--tiptap-toolbar-btn-text);
  background: var(--tiptap-toolbar-btn-hover);
}

.ye-dropdown-btn.is-active {
  color: var(--tiptap-primary);
  background: var(--tiptap-primary-light);
}

.ye-dropdown-btn .ant-btn-icon {
  display: none;
}

.ye-dropdown-btn__content {
  display: inline-flex !important;
  flex-flow: row nowrap !important;
  gap: 2px;
  align-items: center !important;
  justify-content: center;
  height: 100%;
  white-space: nowrap;
}

.ye-dropdown-btn__icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  line-height: 1;
  transition: color 0.2s;
}

.ye-dropdown-btn__icon .anticon {
  font-size: 18px;
}

.ye-dropdown-btn__label {
  flex-shrink: 0;
  font-size: 14px;
  line-height: 1;
}

.ye-dropdown-btn__arrow {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  margin-left: 0;
  font-size: 10px;
  line-height: 1;
  opacity: 0.65;
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.ye-dropdown-btn:hover .ye-dropdown-btn__arrow {
  opacity: 1;
}

.ye-dropdown-overlay {
  max-height: 260px !important;
  overflow-y: auto !important;
}

@media (width <= 768px) {
  .ye-dropdown-overlay {
    max-height: 150px !important;
  }
}

.ye-dropdown-menu-item {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  min-width: 120px;
  font-size: 14px;
}

.ye-dropdown-menu-item__icon {
  font-size: 16px;
  color: rgb(0 0 0 / 65%);
}

[data-theme="dark"] .ye-dropdown-menu-item__icon {
  color: rgb(255 255 255 / 65%);
}

.ye-dropdown-menu-item__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ye-dropdown-overlay .ant-dropdown-menu-item {
  padding: 8px 10px;
}

.ye-dropdown-overlay .ant-dropdown-menu-item-selected {
  color: var(--tiptap-primary) !important;
  background: var(--tiptap-primary-light) !important;
}
</style>
