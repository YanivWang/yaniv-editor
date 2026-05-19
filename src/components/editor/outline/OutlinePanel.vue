<template>
  <aside class="outline-panel" :aria-label="t('editor.outlineTitle')">
    <header class="outline-panel__header">
      <span class="outline-panel__title">{{ t("editor.outlineTitle") }}</span>
      <button
        type="button"
        class="outline-panel__close"
        :title="t('editor.outlineClose')"
        :aria-label="t('editor.outlineClose')"
        @click="close"
      >
        <CloseOutlined />
      </button>
    </header>

    <div v-if="items.length === 0" class="outline-panel__empty">
      {{ t("editor.outlineEmpty") }}
    </div>

    <nav v-else class="outline-panel__list">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="outline-panel__item"
        :class="{ 'is-active': item.isActive }"
        :style="{ paddingLeft: `${12 + (item.level - 1) * 14}px` }"
        @click="scrollToHeading(item)"
      >
        <span v-if="item.itemIndex" class="outline-panel__index">{{ item.itemIndex }}.</span>
        <span class="outline-panel__text">{{ item.textContent }}</span>
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
.outline-panel {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  width: 220px;
  min-width: 220px;
  max-width: 220px;
  height: 100%;
  background: var(--ye-bg);
  border-right: 1px solid var(--ye-border);
}

.outline-panel__header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--ye-border);
}

.outline-panel__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ye-text);
}

.outline-panel__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  color: var(--ye-text-secondary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--ye-radius-sm);
  transition: background var(--ye-transition-normal);

  &:hover {
    background: var(--ye-bg-hover);
  }
}

.outline-panel__empty {
  padding: 16px 12px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--ye-text-muted);
}

.outline-panel__list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-height: 0;
  padding: 8px 0;
  overflow-y: auto;
}

.outline-panel__item {
  display: flex;
  gap: 4px;
  align-items: flex-start;
  width: 100%;
  padding: 6px 12px 6px 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--ye-text-secondary);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 0;
  transition:
    color var(--ye-transition-normal),
    background var(--ye-transition-normal);

  &:hover {
    color: var(--ye-primary);
    background: var(--ye-bg-hover);
  }

  &.is-active {
    color: var(--ye-primary);
    background: var(--ye-primary-light);
  }
}

.outline-panel__index {
  flex-shrink: 0;
  opacity: 0.65;
}

.outline-panel__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
