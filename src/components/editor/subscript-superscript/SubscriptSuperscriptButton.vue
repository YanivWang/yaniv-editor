<template>
  <ToolbarGroup>
    <ToolbarDropdownButton
      :icon="currentIcon"
      :title="buttonTitle"
      :active="isScriptActive"
      :items="menuItems"
      placement="bottomLeft"
    />
  </ToolbarGroup>
</template>

<script setup lang="ts">
/**
 * SubscriptSuperscriptButton - 上标下标下拉按钮
 * @description 将上标与下标合并为一个下拉按钮，通过菜单切换
 */
import { computed } from "vue";

import { ToolbarDropdownButton, ToolbarGroup } from "@/components/base";
import type { MenuItemConfig } from "@/configs/toolbarTypes";
import { useYanivEditor } from "@/core/editorContext";
import { t } from "@/locales";
import { createStateCheckers } from "@/utils/editorState";

import { SubscriptIcon, SuperscriptIcon } from "./ScriptIcons";

import type { Editor } from "@tiptap/vue-3";

interface Props {
  editor?: Editor | null;
}

const props = defineProps<Props>();
const editor = useYanivEditor(() => props.editor);
const { isActive } = createStateCheckers(editor);

const isScriptActive = computed(() => isActive("superscript") || isActive("subscript"));

const currentIcon = computed(() => {
  if (isActive("subscript")) return SubscriptIcon;
  return SuperscriptIcon;
});

const buttonTitle = computed(() => `${t("editor.superscript")}/${t("editor.subscript")}`);

const menuItems = computed<MenuItemConfig[]>(() => [
  {
    key: "superscript",
    label: t("editor.superscript"),
    icon: SuperscriptIcon,
    active: isActive("superscript"),
    action: () => {
      editor.value?.chain().focus().toggleSuperscript().run();
    },
  },
  {
    key: "subscript",
    label: t("editor.subscript"),
    icon: SubscriptIcon,
    active: isActive("subscript"),
    action: () => {
      editor.value?.chain().focus().toggleSubscript().run();
    },
  },
]);
</script>

<style scoped>
:deep(.script-icon) {
  display: inline-flex;
  align-items: center;
  font-size: 19px;
  line-height: 1;
}

:deep(.ye-dropdown-menu-item__icon .script-icon) {
  font-size: 17px;
}

:deep(.script-icon__base) {
  font-weight: 400;
}

:deep(.script-icon__mark) {
  font-size: 0.55em;
  font-weight: 600;
  color: var(--ye-primary);
}
</style>
