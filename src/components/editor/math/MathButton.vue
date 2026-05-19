<template>
  <ToolbarDropdownButton :icon="FunctionOutlined" :title="t('editor.math')" :items="menuItems" />
</template>

<script setup lang="ts">
import { FunctionOutlined } from "@ant-design/icons-vue";
import { computed } from "vue";

import ToolbarDropdownButton from "@/components/base/ToolbarDropdownButton.vue";
import type { MenuItemConfig } from "@/configs/toolbarTypes";
import { t } from "@/locales";

import type { Editor } from "@tiptap/vue-3";

interface Props {
  editor: Editor | null;
}

const props = defineProps<Props>();

const menuItems = computed<MenuItemConfig[]>(() => [
  {
    key: "inline-math",
    label: t("editor.mathInline"),
    action: () => {
      props.editor?.chain().focus().insertInlineMath().run();
    },
  },
  {
    key: "block-math",
    label: t("editor.mathBlock"),
    action: () => {
      props.editor?.chain().focus().insertBlockMath().run();
    },
  },
]);
</script>
