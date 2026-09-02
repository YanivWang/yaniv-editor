<template>
  <ToolbarGroup>
    <ToolbarDropdownButton
      :icon="currentAlignIcon"
      :title="t('editor.align')"
      :items="alignMenuItems"
      placement="bottomLeft"
    />
  </ToolbarGroup>
</template>

<script setup lang="ts">
/**
 * AlignDropdown - 对齐下拉菜单组件
 * @description 可复用的对齐下拉菜单组件（左对齐、居中、右对齐、两端对齐）
 */
import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  MenuOutlined,
} from "@ant-design/icons-vue";
import { computed } from "vue";

import { ToolbarGroup, ToolbarDropdownButton } from "@/components/base";
import type { AlignValue, MenuItemConfig } from "@/configs/toolbarTypes";
import { useYanivEditor } from "@/core/editorContext";
import { useEditorT } from "@/core/infra/useEditorLocale";
import { createCommandRunner } from "@/utils/editorCommands";
import { createStateCheckers } from "@/utils/editorState";

import type { Editor } from "@tiptap/vue-3";

const t = useEditorT();

// ===== Props =====
interface Props {
  editor?: Editor | null;
}

const props = defineProps<Props>();
const editor = useYanivEditor(() => props.editor);

const ALIGN_OPTIONS = [
  { value: "left", labelKey: "editor.alignLeft", icon: AlignLeftOutlined },
  { value: "center", labelKey: "editor.alignCenter", icon: AlignCenterOutlined },
  { value: "right", labelKey: "editor.alignRight", icon: AlignRightOutlined },
  { value: "justify", labelKey: "editor.alignJustify", icon: MenuOutlined },
] as const satisfies ReadonlyArray<{ value: AlignValue; labelKey: string; icon: unknown }>;

// ===== 工具函数 =====
const runCommand = createCommandRunner(editor);
const { isActiveAlign } = createStateCheckers(editor);

// ===== 对齐工具菜单项 =====
/**
 * 四个对齐项。`active` 不能省：按钮图标会跟着当前对齐变
 * （见 {@link currentAlignIcon}），但菜单**打开后**没有选中态，
 * 用户看不出当前是哪一种——本仓库其它下拉（代码块 / 上下标 / 标题）都设了它。
 */
const alignMenuItems = computed<MenuItemConfig[]>(() =>
  ALIGN_OPTIONS.map(({ value, labelKey, icon }) => ({
    key: `align-${value}`,
    label: t(labelKey),
    icon,
    active: isActiveAlign(value),
    action: () => setAlign(value),
  })),
);

/**
 * 获取当前激活的对齐图标
 */
const currentAlignIcon = computed(() => {
  if (isActiveAlign("center")) return AlignCenterOutlined;
  if (isActiveAlign("right")) return AlignRightOutlined;
  if (isActiveAlign("justify")) return MenuOutlined;
  return AlignLeftOutlined;
});

/**
 * 设置文本对齐方式
 */
function setAlign(value: AlignValue) {
  runCommand((chain) => chain.setTextAlign(value))();
}
</script>
