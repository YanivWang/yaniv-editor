<template>
  <aside class="tp-outline-panel" :aria-label="t('editor.outlineTitle')">
    <header class="tp-outline-panel__header">
      <span class="tp-outline-panel__title">{{ t("editor.outlineTitle") }}</span>
      <button
        type="button"
        class="tp-outline-panel__close"
        :title="t('editor.outlineClose')"
        :aria-label="t('editor.outlineClose')"
        @click="close"
      >
        <CloseOutlined />
      </button>
    </header>

    <div v-if="items.length === 0" class="tp-outline-panel__empty">
      {{ t("editor.outlineEmpty") }}
    </div>

    <nav v-else class="tp-outline-panel__list">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="tp-outline-panel__item"
        :class="{ 'is-active': item.isActive }"
        :style="{ paddingLeft: `${12 + (item.level - 1) * 14}px` }"
        @click="scrollToHeading(item)"
      >
        <span v-if="item.itemIndex" class="tp-outline-panel__index">{{ item.itemIndex }}.</span>
        <span class="tp-outline-panel__text">{{ item.textContent }}</span>
      </button>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { CloseOutlined } from "@ant-design/icons-vue";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { t } from "@/locales";

import { useOutlinePanel } from "./useOutlinePanel";

import type { Editor } from "@tiptap/vue-3";

interface OutlineItem {
  id: string;
  textContent: string;
  level: number;
  itemIndex: number;
  isActive: boolean;
  pos: number;
}

interface Props {
  editor: Editor | null | undefined;
}

const props = defineProps<Props>();

const { close } = useOutlinePanel();
const items = ref<OutlineItem[]>([]);

const editor = computed(() => props.editor ?? null);

function syncItems() {
  const e = editor.value;
  if (!e || e.isDestroyed) {
    items.value = [];
    return;
  }

  const storage = e.storage as { tableOfContents?: { content?: OutlineItem[] } };
  items.value = [...(storage.tableOfContents?.content ?? [])];
}

function scrollToHeading(item: OutlineItem) {
  const e = editor.value;
  if (!e || e.isDestroyed) return;

  e.chain()
    .focus()
    .setTextSelection(item.pos + 1)
    .scrollIntoView()
    .run();
}

function attachEditorListeners(e: Editor | null) {
  if (!e || e.isDestroyed) return;

  e.on("transaction", syncItems);
  e.on("update", syncItems);
  syncItems();
}

function detachEditorListeners(e: Editor | null) {
  if (!e || e.isDestroyed) return;

  e.off("transaction", syncItems);
  e.off("update", syncItems);
}

watch(
  editor,
  (next, prev) => {
    detachEditorListeners(prev ?? null);
    attachEditorListeners(next ?? null);
  },
  { immediate: true },
);

onMounted(syncItems);

onBeforeUnmount(() => {
  detachEditorListeners(editor.value);
});
</script>

<style scoped lang="scss">
.tp-outline-panel {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  width: 220px;
  min-width: 220px;
  max-width: 220px;
  height: 100%;
  background: var(--menu-bg, #fff);
  border-right: 1px solid var(--menu-border-color, #e8e8e8);
}

.tp-outline-panel__header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--menu-border-color, #e8e8e8);
}

.tp-outline-panel__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--menu-btn-color, #262626);
}

.tp-outline-panel__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  color: var(--menu-btn-color, #595959);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 4px;
  transition: background 0.2s;

  &:hover {
    background: var(--menu-btn-hover-bg, #f5f5f5);
  }
}

.tp-outline-panel__empty {
  padding: 16px 12px;
  font-size: 12px;
  line-height: 1.5;
  color: #8c8c8c;
}

.tp-outline-panel__list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-height: 0;
  padding: 8px 0;
  overflow-y: auto;
}

.tp-outline-panel__item {
  display: flex;
  gap: 4px;
  align-items: flex-start;
  width: 100%;
  padding: 6px 12px 6px 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--menu-btn-color, #595959);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 0;
  transition:
    color 0.2s,
    background 0.2s;

  &:hover {
    color: var(--menu-primary, #1890ff);
    background: var(--menu-btn-hover-bg, #f5f5f5);
  }

  &.is-active {
    color: var(--menu-primary, #1890ff);
    background: rgb(24 144 255 / 8%);
  }
}

.tp-outline-panel__index {
  flex-shrink: 0;
  opacity: 0.65;
}

.tp-outline-panel__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
