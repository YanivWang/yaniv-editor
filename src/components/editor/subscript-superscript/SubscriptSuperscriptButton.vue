<template>
  <ToolbarGroup>
    <ToolbarButton
      v-for="format in formats"
      :key="format.name"
      :icon="format.icon"
      :title="format.title"
      :active="isActive(format.name)"
      @click="format.action"
    />
  </ToolbarGroup>
</template>

<script setup lang="ts">
/**
 * SubscriptSuperscriptButton - 上标下标按钮组
 * @description 可复用的上标下标按钮组件，提供上标和下标切换功能
 */
import { SortAscendingOutlined, SortDescendingOutlined } from "@ant-design/icons-vue";
import { computed } from "vue";

import { ToolbarButton, ToolbarGroup } from "@/base";
import { t } from "@/locales";
import { createStateCheckers } from "@/utils/editorState";

import type { Editor } from "@tiptap/vue-3";

// ===== Props =====
interface Props {
  editor: Editor | null | undefined;
}

const props = defineProps<Props>();
const editor = computed(() => props.editor ?? null);

// ===== 工具函数 =====
const { isActive } = createStateCheckers(editor);

// ===== 格式配置 =====
const formats = computed(() => [
  {
    name: "superscript",
    icon: SortDescendingOutlined,
    title: t("editor.superscript"),
    action: () => {
      const e = editor.value;
      if (!e) return;
      e.chain().focus().toggleSuperscript().run();
    },
  },
  {
    name: "subscript",
    icon: SortAscendingOutlined,
    title: t("editor.subscript"),
    action: () => {
      const e = editor.value;
      if (!e) return;
      e.chain().focus().toggleSubscript().run();
    },
  },
]);
</script>
