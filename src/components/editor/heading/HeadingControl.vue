<template>
  <ToolbarGroup v-if="variant === 'buttons'">
    <ToolbarButton
      v-for="heading in buttonHeadings"
      :key="heading.level"
      :title="heading.title"
      :active="isHeadingActive(heading.level)"
      class="heading-btn"
      :data-level="heading.level"
      @click="heading.action"
    >
      H{{ heading.level }}
    </ToolbarButton>
  </ToolbarGroup>

  <ToolbarGroup v-else>
    <ToolbarDropdownButton
      :icon="FontSizeOutlined"
      :title="t('editor.heading')"
      :items="dropdownItems"
      placement="bottomLeft"
    />
  </ToolbarGroup>
</template>

<script setup lang="ts">
/**
 * HeadingControl - 标题控件（按钮组 / 下拉）
 */
import { FontSizeOutlined } from "@ant-design/icons-vue";
import { computed } from "vue";

import { ToolbarButton, ToolbarGroup, ToolbarDropdownButton } from "@/components/base";
import type { HeadingLevel, MenuItemConfig } from "@/configs/toolbarTypes";
import { useYanivEditor } from "@/core/editorContext";
import { t } from "@/locales";

import { useHeadingActions } from "./useHeadingActions";

import type { Editor } from "@tiptap/vue-3";

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

const buttonHeadings = computed(() =>
  props.levels.map((level) => ({
    level,
    action: toggleHeadingLevel(level),
    title: t(`editor.h${level}`),
  })),
);

const dropdownItems = computed<MenuItemConfig[]>(() => {
  if (!editor.value) return [];
  return headingOptions.map((opt) => ({
    key: opt.value,
    label: t(`editor.${opt.value}`),
    action: () => setHeadingValue(opt.value),
  }));
});
</script>

<style scoped>
.heading-btn {
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  font-weight: bold;
}
</style>
