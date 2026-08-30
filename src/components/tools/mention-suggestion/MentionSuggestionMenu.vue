<template>
  <teleport v-if="overlayPortal" :to="overlayPortal">
    <div
      v-if="isVisible"
      :id="popupId"
      class="mention-suggestion-menu"
      role="listbox"
      :aria-label="t('slashCommand.mentionMenuLabel')"
      :class="appearanceClass"
      :data-color-mode="resolvedColorMode"
      :style="menuStyle"
      @mousedown.prevent
    >
      <button
        v-for="(item, index) in suggestions"
        :id="optionId(index)"
        :key="item.id"
        type="button"
        role="option"
        class="mention-suggestion-menu__item"
        :class="{ 'is-active': index === selectedIndex }"
        :aria-selected="index === selectedIndex"
        @click="selectItem(item)"
        @focus="selectedIndex = index"
        @mouseenter="selectedIndex = index"
      >
        <span class="mention-suggestion-menu__type">{{ item.type === "user" ? "@" : "#" }}</span>
        <span class="mention-suggestion-menu__label">{{ item.label }}</span>
      </button>
      <div v-if="suggestions.length === 0" class="mention-suggestion-menu__empty">
        {{ t("slashCommand.mentionNoResults") }}
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";

import { getAppearanceClassName, useInjectEditorAppearance } from "@/appearance";
import { useVirtualFocusPopup } from "@/composables/useVirtualFocusPopup";
import { useOverlayPortal, useYanivEditor } from "@/core/editorContext";
import { useEditorT } from "@/core/infra/useEditorLocale";
import { getMentionSuggestions, mentionPluginKey, type MentionItem } from "@/extensions/mention";

const t = useEditorT();
const editor = useYanivEditor();
const overlayPortal = useOverlayPortal();

const appearanceCtx = useInjectEditorAppearance();
const appearanceClass = computed(() =>
  getAppearanceClassName(appearanceCtx?.appearance.value ?? "default"),
);
const resolvedColorMode = computed(() => appearanceCtx?.resolvedMode.value ?? "light");

const isVisible = ref(false);
const query = ref("");
const selectedIndex = ref(0);
const position = ref({ x: 0, y: 0 });

const suggestions = computed(() => getMentionSuggestions(query.value));

/** 虚拟焦点：焦点留在正文，用 aria-activedescendant 指向当前候选项 */
const popupId = `yaniv-mention-menu-${useId()}`;
const optionId = (index: number) => `${popupId}-option-${index}`;
const activeOptionId = computed(() =>
  isVisible.value && suggestions.value.length ? optionId(selectedIndex.value) : null,
);

useVirtualFocusPopup({ editor, visible: isVisible, popupId, activeOptionId });

const menuStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
}));

function syncFromEditor() {
  const e = editor.value;
  if (!e || !e.state.schema.nodes.mention) {
    isVisible.value = false;
    return;
  }

  const state = mentionPluginKey.getState(e.state) as
    | { active: boolean; query: string }
    | undefined;

  if (!state?.active) {
    isVisible.value = false;
    return;
  }

  query.value = state.query;
  selectedIndex.value = 0;
  isVisible.value = true;

  const { from } = e.state.selection;
  const coords = e.view.coordsAtPos(from);
  position.value = {
    x: coords.left,
    y: coords.bottom + 8,
  };
}

function selectItem(item: MentionItem) {
  editor.value?.chain().focus().insertMention(item).run();
  isVisible.value = false;
}

function onKeyDown(event: KeyboardEvent) {
  if (!isVisible.value) return;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    selectedIndex.value = (selectedIndex.value + 1) % Math.max(suggestions.value.length, 1);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    selectedIndex.value =
      (selectedIndex.value - 1 + Math.max(suggestions.value.length, 1)) %
      Math.max(suggestions.value.length, 1);
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    const item = suggestions.value[selectedIndex.value];
    if (item) selectItem(item);
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    isVisible.value = false;
  }
}

let offTransaction: (() => void) | undefined;

watch(
  editor,
  (e) => {
    offTransaction?.();
    if (!e) return;
    const handler = () => syncFromEditor();
    e.on("transaction", handler);
    offTransaction = () => e.off("transaction", handler);
    syncFromEditor();
  },
  { immediate: true },
);

onMounted(() => {
  window.addEventListener("keydown", onKeyDown, true);
});

onBeforeUnmount(() => {
  offTransaction?.();
  window.removeEventListener("keydown", onKeyDown, true);
});
</script>
