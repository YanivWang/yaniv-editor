<template>
  <a-dropdown
    v-model:open="dropdownOpen"
    :placement="placement"
    :trigger="['click']"
    @open-change="handleOpenChange"
  >
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

          <a-menu-item v-else-if="isSplitHoverItem(item)" :key="item.key + ':split-hover'">
            <slot
              name="split-item"
              :item="item"
              :on-primary-click="() => onSplitPrimary(item)"
              :on-child-select="onSplitChildSelect"
            >
              <div
                class="ye-dropdown-split"
                @mouseenter="onSplitRowEnter(item)"
                @mouseleave="onSplitRowLeave(item)"
              >
                <span class="ye-dropdown-split__main" @click.stop="onSplitPrimary(item)">
                  <component :is="item.icon" v-if="item.icon" class="ye-dropdown-menu-item__icon" />
                  <span class="ye-dropdown-menu-item__label">{{ item.label }}</span>
                </span>
                <a-dropdown
                  :trigger="hasSplitSelection(item) ? ['hover'] : []"
                  placement="rightTop"
                  :open="isSplitOverlayOpen(item)"
                  @open-change="(open: boolean) => onSplitOverlayOpenChange(item, open)"
                >
                  <span
                    class="ye-dropdown-split__arrow"
                    :title="item.splitArrowTitle || splitHoverArrowTitle"
                  >
                    <RightOutlined />
                  </span>
                  <template #overlay>
                    <div
                      class="ye-dropdown-split-overlay"
                      @mouseenter="cancelSplitClose"
                      @mouseleave="scheduleSplitClose(item)"
                    >
                      <a-menu
                        class="ye-dropdown-overlay"
                        :selected-keys="item.selectedChildKey ? [item.selectedChildKey] : []"
                        @click="onSplitChildSelect"
                      >
                        <a-menu-item
                          v-for="child in item.children"
                          :key="child.key"
                          :disabled="child.disabled"
                          :danger="child.danger"
                        >
                          <span class="ye-dropdown-menu-item">
                            <span class="ye-dropdown-menu-item__label">{{ child.label }}</span>
                          </span>
                        </a-menu-item>
                      </a-menu>
                    </div>
                  </template>
                </a-dropdown>
              </div>
            </slot>
          </a-menu-item>

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
import { DownOutlined, RightOutlined } from "@ant-design/icons-vue";
import { Tooltip as ATooltip } from "ant-design-vue";
import { ref } from "vue";

import type { MenuItemConfig } from "@/configs/toolbarTypes";
import { findMenuItemByKey } from "@/utils/menuItem";

import type { Component } from "vue";

const dropdownOpen = ref(false);
const splitOverlayKey = ref<string | null>(null);
let splitCloseTimeout: number | null = null;

interface Props {
  icon?: Component;
  label?: string;
  title?: string;
  active?: boolean;
  items: MenuItemConfig[];
  placement?: "top" | "bottom" | "bottomLeft" | "bottomRight" | "topLeft" | "topRight";
  /** split-hover 项右侧箭头的默认 tooltip */
  splitHoverArrowTitle?: string;
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
  placement: "bottom",
});

const emit = defineEmits<{
  select: [key: string];
  splitPrimary: [itemKey: string];
}>();

function isSplitHoverItem(item: MenuItemConfig): boolean {
  return item.submenuMode === "split-hover" && !!item.children?.length;
}

function hasSplitSelection(item: MenuItemConfig): boolean {
  return !!item.selectedChildKey;
}

function isSplitOverlayOpen(item: MenuItemConfig): boolean {
  return splitOverlayKey.value === item.key;
}

function cancelSplitClose() {
  if (splitCloseTimeout) {
    clearTimeout(splitCloseTimeout);
    splitCloseTimeout = null;
  }
}

function scheduleSplitClose(item: MenuItemConfig) {
  if (hasSplitSelection(item)) return;
  cancelSplitClose();
  splitCloseTimeout = window.setTimeout(() => {
    if (splitOverlayKey.value === item.key) {
      splitOverlayKey.value = null;
    }
  }, 150);
}

function onSplitRowEnter(item: MenuItemConfig) {
  if (hasSplitSelection(item)) return;
  cancelSplitClose();
  splitOverlayKey.value = item.key;
}

function onSplitRowLeave(item: MenuItemConfig) {
  scheduleSplitClose(item);
}

function onSplitOverlayOpenChange(item: MenuItemConfig, open: boolean) {
  if (hasSplitSelection(item)) {
    splitOverlayKey.value = open ? item.key : null;
  }
}

function onSplitPrimary(item: MenuItemConfig) {
  if (!hasSplitSelection(item)) {
    splitOverlayKey.value = item.key;
    emit("splitPrimary", item.key);
    return;
  }

  dropdownOpen.value = false;
  splitOverlayKey.value = null;
  item.action?.();
  emit("splitPrimary", item.key);
}

function onSplitChildSelect(info: { key: string }) {
  const item = findMenuItemByKey(props.items, info.key);
  if (!item) return;

  dropdownOpen.value = false;
  splitOverlayKey.value = null;
  item.action?.();
  emit("select", info.key);
}

function handleOpenChange(open: boolean) {
  if (!open) {
    splitOverlayKey.value = null;
    cancelSplitClose();
  }
}

function onMenuClick(info: { key: string }) {
  if (info.key.endsWith(":split-hover")) return;

  const item = findMenuItemByKey(props.items, info.key);
  if (!item) return;

  dropdownOpen.value = false;
  splitOverlayKey.value = null;
  item.action?.();
  emit("select", info.key);
}
</script>
