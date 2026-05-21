<template>
  <ToolbarGroup v-if="variant === 'buttons'" class="heading-control-buttons">
    <ToolbarButton
      v-for="heading in buttonHeadings"
      :key="heading.level"
      :title="heading.title"
      :active="isHeadingActive(heading.level)"
      :data-level="heading.level"
      @click="heading.action"
    >
      <span class="ye-heading-btn-label">H{{ heading.level }}</span>
    </ToolbarButton>
  </ToolbarGroup>

  <ToolbarGroup v-else class="heading-control-dropdown">
    <ToolbarDropdownButton
      :label="currentLabel"
      :title="t('editor.heading')"
      :items="dropdownItems"
      overlay-class-name="ye-heading-dropdown-overlay"
      placement="bottomLeft"
    />
  </ToolbarGroup>
</template>

<script setup lang="ts">
/**
 * HeadingControl - 标题控件（按钮组 / 下拉）
 */
import { computed, ref, watch } from "vue";

import { ToolbarButton, ToolbarGroup, ToolbarDropdownButton } from "@/components/base";
import type { HeadingLevel, MenuItemConfig } from "@/configs/toolbarTypes";
import { useYanivEditor } from "@/core/editorContext";
import { useEditorT } from "@/core/infra/useEditorLocale";
import { getCurrentParagraphStyle } from "@/utils/editorState";

import { HEADING_ITEM_ICONS } from "./HeadingIcons";
import { useHeadingActions } from "./useHeadingActions";

import type { Editor } from "@tiptap/vue-3";

const t = useEditorT();

type HeadingVariant = "buttons" | "dropdown";

interface Props {
  editor?: Editor | null;
  variant?: HeadingVariant;
  /** buttons 模式下显示的标题级别，默认 [1, 2, 3] */
  levels?: HeadingLevel[];
}

const props = withDefaults(defineProps<Props>(), {
  variant: "dropdown",
  levels: () => [1, 2, 3],
});

const editor = useYanivEditor(() => props.editor);
const { headingOptions, isHeadingActive, setHeadingValue, toggleHeadingLevel } =
  useHeadingActions(editor);

const currentStyle = ref("paragraph");

watch(
  editor,
  (e, _prev, onCleanup) => {
    if (!e) return;

    const sync = () => {
      currentStyle.value = getCurrentParagraphStyle(e);
    };

    sync();
    e.on("selectionUpdate", sync);
    e.on("transaction", sync);

    onCleanup(() => {
      e.off("selectionUpdate", sync);
      e.off("transaction", sync);
    });
  },
  { immediate: true },
);

const buttonHeadings = computed(() =>
  props.levels.map((level) => ({
    level,
    action: toggleHeadingLevel(level),
    title: t(`editor.h${level}`),
  })),
);

const currentLabel = computed(() => t(`editor.${currentStyle.value}`));

const dropdownItems = computed<MenuItemConfig[]>(() => {
  if (!editor.value) return [];
  return headingOptions.map((opt) => ({
    key: opt.value,
    label: t(`editor.${opt.value}`),
    icon: HEADING_ITEM_ICONS[opt.value],
    active: currentStyle.value === opt.value,
    action: () => setHeadingValue(opt.value),
  }));
});
</script>
