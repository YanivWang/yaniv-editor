<template>
  <ToolbarDropdownButton :icon="FunctionOutlined" :title="t('editor.math')" :items="menuItems" />
</template>

<script setup lang="ts">
import { FunctionOutlined } from "@ant-design/icons-vue";
import { computed } from "vue";

import ToolbarDropdownButton from "@/components/base/ToolbarDropdownButton.vue";
import type { MenuItemConfig } from "@/configs/toolbarTypes";
import { useYanivEditor } from "@/core/editorContext";
import { useEditorT } from "@/core/infra/useEditorLocale";

import type { Editor } from "@tiptap/vue-3";

const t = useEditorT();

interface Props {
  editor?: Editor | null;
}

const props = defineProps<Props>();
const editor = useYanivEditor(() => props.editor);

const menuItems = computed<MenuItemConfig[]>(() => [
  {
    key: "inline-math",
    label: t("editor.mathInline"),
    action: () => {
      editor.value?.chain().focus().insertInlineMath().run();
    },
  },
  {
    key: "block-math",
    label: t("editor.mathBlock"),
    action: () => {
      editor.value?.chain().focus().insertBlockMath().run();
    },
  },
]);
</script>
