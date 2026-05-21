<template>
  <aside class="outline-panel" :class="placementClass" :aria-label="t('editor.outlineTitle')">
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

    <nav v-else ref="listRef" class="outline-panel__list">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="outline-panel__item"
        :class="[headingLevelClass(item.originalLevel), { 'is-active': item.isActive }]"
        :style="{ paddingLeft: `${12 + (item.level - 1) * 14}px` }"
        :data-outline-id="item.id"
        :aria-current="item.isActive ? 'location' : undefined"
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
import { computed, onBeforeUnmount, ref, watch } from "vue";

import { useYanivEditor } from "@/core/editorContext";
import { t } from "@/locales";

import { getOutlineScrollOffset, scrollToOutlineHeading } from "./scrollToOutlineHeading";
import { useOutlinePanel } from "./useOutlinePanel";

import type { Editor } from "@tiptap/core";

type OutlineAnchor = "top-left" | "top-right";

interface OutlineItem {
  id: string;
  textContent: string;
  level: number;
  originalLevel: number;
  itemIndex: number;
  isActive: boolean;
  pos: number;
  dom?: HTMLElement;
}

interface Props {
  editor?: Editor | null;
  placement?: OutlineAnchor;
  scrollParent?: () => HTMLElement | null;
  zoomLevel?: number;
}

const props = withDefaults(defineProps<Props>(), {
  placement: "top-left",
  scrollParent: () => null,
  zoomLevel: 100,
});

const { close } = useOutlinePanel();
const items = ref<OutlineItem[]>([]);
const listRef = ref<HTMLElement | null>(null);

const editor = useYanivEditor(() => props.editor);

const placementClass = computed(() => `outline-panel--${props.placement}`);

const activeItemId = computed(() => items.value.find((item) => item.isActive)?.id ?? null);

function clampHeadingLevel(level: number): number {
  return Math.min(6, Math.max(1, Math.round(level) || 1));
}

function headingLevelClass(originalLevel: number): string {
  return `outline-panel__item--h${clampHeadingLevel(originalLevel)}`;
}

function debounce<T extends (...args: never[]) => void>(fn: T, wait: number): T {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  }) as T;
}

function resolveHeadingIdAtSelection(e: Editor): string | null {
  const { $from } = e.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === "heading") {
      const tocId = node.attrs["data-toc-id"];
      if (typeof tocId === "string" && tocId.length > 0) return tocId;
      const id = node.attrs.id;
      if (typeof id === "string" && id.length > 0) return id;
    }
  }
  return null;
}

function resolveActiveIdByScroll(scrollParent: HTMLElement, source: OutlineItem[]): string | null {
  const containerRect = scrollParent.getBoundingClientRect();
  let activeId: string | null = null;

  for (const item of source) {
    const el = item.dom;
    if (!el || !(el instanceof HTMLElement)) continue;

    const relativeTop = el.getBoundingClientRect().top - containerRect.top;
    if (relativeTop <= getOutlineScrollOffset(scrollParent)) {
      activeId = item.id;
    }
  }

  return activeId;
}

function applyActiveState(source: OutlineItem[], activeId: string | null): OutlineItem[] {
  if (!activeId) return source;
  return source.map((item) => ({
    ...item,
    isActive: item.id === activeId,
  }));
}

function syncItems() {
  const e = editor.value;
  if (!e || e.isDestroyed) {
    items.value = [];
    return;
  }

  const storage = e.storage as { tableOfContents?: { content?: OutlineItem[] } };
  let nextItems: OutlineItem[] = (storage.tableOfContents?.content ?? []).map((item) => ({
    ...item,
    originalLevel: clampHeadingLevel(item.originalLevel ?? item.level),
  }));

  const scrollParent = props.scrollParent();
  if (scrollParent) {
    const scrollActiveId = resolveActiveIdByScroll(scrollParent, nextItems);
    if (scrollActiveId) {
      nextItems = applyActiveState(nextItems, scrollActiveId);
    }
  }

  const selectionActiveId = resolveHeadingIdAtSelection(e);
  if (selectionActiveId) {
    nextItems = applyActiveState(nextItems, selectionActiveId);
  }

  items.value = nextItems;
}

const debouncedSyncItems = debounce(syncItems, 50);

function scrollToHeading(item: OutlineItem) {
  const e = editor.value;
  if (!e || e.isDestroyed) return;

  e.chain()
    .focus()
    .setTextSelection(item.pos + 1)
    .run();

  const scrollParent = props.scrollParent();
  if (!scrollToOutlineHeading(scrollParent, item.dom)) {
    e.commands.scrollIntoView();
  }
}

let boundScrollParent: HTMLElement | null = null;

function bindScrollParent(element: HTMLElement | null) {
  if (boundScrollParent) {
    boundScrollParent.removeEventListener("scroll", debouncedSyncItems);
    boundScrollParent = null;
  }

  if (!element) return;

  element.addEventListener("scroll", debouncedSyncItems, { passive: true });
  boundScrollParent = element;
}

function attachEditorListeners(e: Editor | null) {
  if (!e || e.isDestroyed) return;

  e.on("transaction", syncItems);
  e.on("update", syncItems);
  e.on("selectionUpdate", syncItems);
  syncItems();
}

function detachEditorListeners(e: Editor | null) {
  if (!e || e.isDestroyed) return;

  e.off("transaction", syncItems);
  e.off("update", syncItems);
  e.off("selectionUpdate", syncItems);
}

watch(
  editor,
  (next, prev) => {
    detachEditorListeners(prev ?? null);
    attachEditorListeners(next ?? null);
  },
  { immediate: true },
);

watch(
  () => props.scrollParent(),
  (element) => {
    bindScrollParent(element);
    syncItems();
  },
  { immediate: true },
);

watch(
  () => props.zoomLevel,
  () => {
    syncItems();
  },
);

watch(activeItemId, (id, prevId) => {
  if (!id || id === prevId || !listRef.value) return;

  const activeButton = listRef.value.querySelector<HTMLElement>(`[data-outline-id="${id}"]`);
  activeButton?.scrollIntoView({ block: "nearest" });
});

onBeforeUnmount(() => {
  detachEditorListeners(editor.value);
  bindScrollParent(null);
});
</script>
