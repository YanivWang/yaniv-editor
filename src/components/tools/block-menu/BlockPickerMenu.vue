<template>
  <teleport to="body">
    <div
      v-if="isVisible"
      ref="menuRef"
      class="block-picker-menu"
      :style="menuStyle"
      @mousedown.prevent
    >
      <div v-if="filteredGroups.length > 0" class="block-picker-list">
        <template v-for="group in filteredGroups" :key="group.id">
          <div class="block-picker-group-title">{{ group.title }}</div>
          <button
            v-for="(item, itemIdx) in group.items"
            :key="item.id"
            class="block-picker-item"
            :class="{ active: isFlatIndex(group, itemIdx) === selectedIndex }"
            @click="selectItem(item)"
            @mouseenter="selectedIndex = isFlatIndex(group, itemIdx)"
          >
            <span class="block-picker-item-icon">
              <component :is="item.icon" />
            </span>
            <span class="block-picker-item-content">
              <span class="block-picker-item-title">{{ item.title }}</span>
              <span class="block-picker-item-desc">{{ item.description }}</span>
            </span>
          </button>
        </template>
      </div>

      <div v-else class="block-picker-empty">
        {{ t("slashCommand.noResults") }}
      </div>
    </div>

    <div v-if="isVisible" class="block-picker-backdrop" @mousedown="hide" />
  </teleport>
</template>

<script setup lang="ts">
/**
 * BlockPickerMenu - Notion 风格统一块选择菜单
 * @description 供斜杠命令（transform）与拖拽柄 + 号（insert）共用
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

import { t } from "@/locales";
import { slashCommandKey, type SlashCommandState } from "@/tools/slash-command";

import {
  applyBlockInsert,
  applyBlockTransform,
  insertBlockMediaAt,
  isMediaBlockId,
  pickMediaFile,
} from "./blockMenuActions";
import { getBlockMenuGroups } from "./blockMenuRegistry";

import type {
  BlockInsertContext,
  BlockMenuItemDef,
  BlockMenuGroupDef,
  BlockPickerMode,
} from "./types";
import type { Editor } from "@tiptap/core";

const props = defineProps<{
  editor: Editor | null | undefined;
}>();

const isVisible = ref(false);
const mode = ref<BlockPickerMode | null>(null);
const position = ref({ x: 0, y: 0 });
const query = ref("");
const selectedIndex = ref(0);
const menuRef = ref<HTMLElement | null>(null);
const insertContext = ref<BlockInsertContext | null>(null);

const commandGroups = computed(() => getBlockMenuGroups());

const filteredGroups = computed<BlockMenuGroupDef[]>(() => {
  const q = query.value.toLowerCase();
  if (!q) return commandGroups.value;

  return commandGroups.value
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.keywords.some((keyword) => keyword.toLowerCase().includes(q)),
      ),
    }))
    .filter((group) => group.items.length > 0);
});

const flatItems = computed(() => filteredGroups.value.flatMap((group) => group.items));

const menuStyle = computed(() => ({
  position: "fixed" as const,
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
  zIndex: 1002,
}));

function isFlatIndex(group: BlockMenuGroupDef, itemIdx: number): number {
  let idx = 0;
  for (const currentGroup of filteredGroups.value) {
    if (currentGroup === group) return idx + itemIdx;
    idx += currentGroup.items.length;
  }
  return idx + itemIdx;
}

function setInsertMenuOpen(open: boolean): void {
  const editor = props.editor;
  if (!editor?.storage.dragHandle) return;
  editor.storage.dragHandle.insertMenuOpen = open;
}

function selectItem(item: BlockMenuItemDef) {
  const editor = props.editor;
  if (!editor || !mode.value) return;

  if (isMediaBlockId(item.id)) {
    const accept = item.id === "image" ? "image/*" : "video/*";
    const currentMode = mode.value;
    const context = insertContext.value;

    if (currentMode === "slash") {
      const pluginState = slashCommandKey.getState(editor.state) as SlashCommandState | undefined;
      const slashRange = pluginState?.range ? { ...pluginState.range } : null;
      const insertPos = slashRange?.from ?? editor.state.selection.from;

      // 先删除 "/" 触发文本再打开文件选择器，避免失焦后斜杠命令重新激活并残留「无匹配结果」
      if (slashRange) {
        editor.chain().focus().deleteRange(slashRange).run();
      }

      hide();

      void pickMediaFile(accept).then((src) => {
        if (!src) return;
        insertBlockMediaAt(editor, insertPos, item.id, src);
      });

      return;
    }

    hide();

    void pickMediaFile(accept).then((src) => {
      if (!src) return;
      if (context) {
        insertBlockMediaAt(editor, context.insertPos, item.id, src);
      }
    });

    return;
  }

  if (mode.value === "slash") {
    const pluginState = slashCommandKey.getState(editor.state) as SlashCommandState | undefined;
    if (pluginState?.range) {
      editor.chain().focus().deleteRange(pluginState.range).run();
    }
    applyBlockTransform(editor, item.id);
  } else if (insertContext.value) {
    applyBlockInsert(editor, insertContext.value, item.id);
  }

  hide();
}

function activate(state: SlashCommandState) {
  if (!state.decorationPosition) return;

  mode.value = "slash";
  insertContext.value = null;
  position.value = { x: state.decorationPosition.x, y: state.decorationPosition.y + 4 };
  query.value = state.query;
  isVisible.value = true;
  selectedIndex.value = 0;

  nextTick(() => {
    adjustPosition();
  });
}

function openInsert(context: BlockInsertContext) {
  mode.value = "insert";
  insertContext.value = context;
  position.value = {
    x: context.anchorRect.right + 8,
    y: context.blockRect.bottom,
  };
  query.value = "";
  isVisible.value = true;
  selectedIndex.value = 0;
  setInsertMenuOpen(true);

  nextTick(() => {
    adjustPosition();
  });
}

function hide() {
  if (!isVisible.value) return;

  const previousMode = mode.value;
  const editor = props.editor;

  if (previousMode === "insert") {
    setInsertMenuOpen(false);
  }

  isVisible.value = false;
  mode.value = null;
  insertContext.value = null;
  query.value = "";
  selectedIndex.value = 0;

  if (editor && previousMode === "slash") {
    const { tr } = editor.state;
    tr.setMeta(slashCommandKey, { deactivate: true });
    editor.view.dispatch(tr);
  }
}

function updateQuery(newQuery: string) {
  query.value = newQuery;
  selectedIndex.value = 0;
}

function adjustPosition() {
  const el = menuRef.value;
  if (!el) return;

  const rect = el.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const margin = 8;

  let { x, y } = position.value;

  if (x + rect.width + margin > viewportWidth) {
    x = viewportWidth - rect.width - margin;
  }

  if (mode.value === "insert" && insertContext.value) {
    // 菜单底部与当前块底部对齐（与占位行下边一致）
    y = insertContext.value.blockRect.bottom - rect.height;
    if (y < margin) {
      y = margin;
    }
  } else if (y + rect.height + margin > viewportHeight) {
    y = y - rect.height - 24;
  }

  position.value = { x: Math.max(margin, x), y: Math.max(margin, y) };
}

function handleKeyDown(event: KeyboardEvent) {
  if (!isVisible.value) return;

  const totalItems = flatItems.value.length;
  if (totalItems === 0) return;

  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      selectedIndex.value = (selectedIndex.value + 1) % totalItems;
      scrollToSelected();
      break;
    case "ArrowUp":
      event.preventDefault();
      selectedIndex.value = (selectedIndex.value - 1 + totalItems) % totalItems;
      scrollToSelected();
      break;
    case "Enter":
      event.preventDefault();
      if (flatItems.value[selectedIndex.value]) {
        selectItem(flatItems.value[selectedIndex.value]);
      }
      break;
    case "Escape":
      event.preventDefault();
      hide();
      break;
  }
}

function scrollToSelected() {
  nextTick(() => {
    const el = menuRef.value;
    if (!el) return;
    const activeItem = el.querySelector(".block-picker-item.active");
    activeItem?.scrollIntoView({ block: "nearest" });
  });
}

onMounted(() => {
  document.addEventListener("keydown", handleKeyDown, true);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeyDown, true);
});

watch(query, () => {
  selectedIndex.value = 0;
});

defineExpose({
  activate,
  openInsert,
  hide,
  updateQuery,
  isVisible,
});
</script>
