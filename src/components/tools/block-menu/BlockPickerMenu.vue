<template>
  <teleport to="body">
    <div
      v-if="isVisible"
      ref="menuRef"
      class="block-picker-menu"
      :class="appearanceClass"
      :data-color-mode="resolvedColorMode"
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
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from "vue";

import { getAppearanceClassName, useInjectEditorAppearance } from "@/appearance";
import { slashCommandKey, type SlashCommandState } from "@/components/tools/slash-command";
import { useYanivEditor } from "@/core/editorContext";
import type { MediaUploadHandler } from "@/core/editorTypes";
import { useEditorT } from "@/core/infra/useEditorLocale";
import { blockMenuHostKey } from "@/core/shell/useBlockMenuHost";
import {
  getBlockMenuAnchorPosition,
  resolveFloatingMenuPosition,
} from "@/utils/floatingMenuPosition";

import {
  applyBlockInsert,
  applyBlockTransform,
  insertBlockEmbedAt,
  insertBlockMediaAt,
  isMediaBlockId,
  pickMediaUrl,
  promptEmbedUrl,
} from "./blockMenuActions";
import { getBlockMenuGroups } from "./blockMenuRegistry";

import type { BlockMenuFeatureGates } from "./blockMenuRegistry";
import type {
  BlockInsertContext,
  BlockMenuItemDef,
  BlockMenuGroupDef,
  BlockPickerMode,
} from "./types";
import type { Editor } from "@tiptap/core";

const t = useEditorT();

const appearanceCtx = useInjectEditorAppearance();
const appearanceClass = computed(() =>
  getAppearanceClassName(appearanceCtx?.appearance.value ?? "default"),
);
const resolvedColorMode = computed(() => appearanceCtx?.resolvedMode.value ?? "light");

const props = defineProps<{
  editor?: Editor | null;
  features?: BlockMenuFeatureGates;
  uploadImage?: MediaUploadHandler;
  uploadVideo?: MediaUploadHandler;
}>();

const editor = useYanivEditor(() => props.editor);

const isVisible = ref(false);
const mode = ref<BlockPickerMode | null>(null);
const position = ref({ x: 0, y: 0 });
const query = ref("");
const selectedIndex = ref(0);
const menuRef = ref<HTMLElement | null>(null);
const insertContext = ref<BlockInsertContext | null>(null);

const commandGroups = computed(() =>
  getBlockMenuGroups(props.features, t, editor.value?.state.schema),
);

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
  const e = editor.value;
  if (!e?.storage.dragHandle) return;
  e.storage.dragHandle.insertMenuOpen = open;
}

function selectItem(item: BlockMenuItemDef) {
  const e = editor.value;
  if (!e || !mode.value) return;

  const blockId = item.id;
  if (blockId === "embed") {
    const currentMode = mode.value;
    const context = insertContext.value;

    if (currentMode === "slash") {
      const pluginState = slashCommandKey.getState(e.state) as SlashCommandState | undefined;
      const slashRange = pluginState?.range ? { ...pluginState.range } : null;
      const insertPos = slashRange?.from ?? e.state.selection.from;
      if (slashRange) {
        e.chain().focus().deleteRange(slashRange).run();
      }
      hide();
      void promptEmbedUrl(t).then((url) => {
        if (!url) return;
        insertBlockEmbedAt(e, insertPos, url);
      });
      return;
    }

    hide();
    void promptEmbedUrl(t).then((url) => {
      if (!url || !context) return;
      insertBlockEmbedAt(e, context.insertPos, url);
    });
    return;
  }

  if (isMediaBlockId(blockId)) {
    const accept = blockId === "image" ? "image/*" : "video/*";
    const upload = blockId === "image" ? props.uploadImage : props.uploadVideo;
    const currentMode = mode.value;
    const context = insertContext.value;

    if (currentMode === "slash") {
      const pluginState = slashCommandKey.getState(e.state) as SlashCommandState | undefined;
      const slashRange = pluginState?.range ? { ...pluginState.range } : null;
      const insertPos = slashRange?.from ?? e.state.selection.from;

      // 先删除 "/" 触发文本再打开文件选择器，避免失焦后斜杠命令重新激活并残留「无匹配结果」
      if (slashRange) {
        e.chain().focus().deleteRange(slashRange).run();
      }

      hide();

      void pickMediaUrl(accept, blockId, upload, t).then((src) => {
        if (!src) return;
        insertBlockMediaAt(e, insertPos, blockId, src);
      });

      return;
    }

    hide();

    void pickMediaUrl(accept, blockId, upload, t).then((src) => {
      if (!src) return;
      if (context) {
        insertBlockMediaAt(e, context.insertPos, blockId, src);
      }
    });

    return;
  }

  if (mode.value === "slash") {
    const pluginState = slashCommandKey.getState(e.state) as SlashCommandState | undefined;
    if (pluginState?.range) {
      e.chain().focus().deleteRange(pluginState.range).run();
    }
    applyBlockTransform(e, item.id);
  } else if (insertContext.value) {
    applyBlockInsert(e, insertContext.value, item.id);
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
  position.value = getBlockMenuAnchorPosition(context.anchorRect, context.blockRect.top);
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
  const e = editor.value;

  if (previousMode === "insert") {
    setInsertMenuOpen(false);
  }

  isVisible.value = false;
  mode.value = null;
  insertContext.value = null;
  query.value = "";
  selectedIndex.value = 0;

  if (e && previousMode === "slash") {
    const { tr } = e.state;
    tr.setMeta(slashCommandKey, { deactivate: true });
    e.view.dispatch(tr);
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
  position.value = resolveFloatingMenuPosition({
    x: position.value.x,
    y: position.value.y,
    menuWidth: rect.width,
    menuHeight: rect.height,
  });
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

const host = inject(blockMenuHostKey, null);

onMounted(() => {
  document.addEventListener("keydown", handleKeyDown, true);
  host?.registerInstance({
    activate,
    openInsert,
    hide,
    updateQuery,
  });
});

onBeforeUnmount(() => {
  host?.registerInstance(null);
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
