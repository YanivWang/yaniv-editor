<template>
  <ToolbarGroup>
    <ToolbarButton
      v-for="format in textFormats"
      :key="format.name"
      :icon="format.icon"
      :title="format.title"
      :active="format.activeCheck ? format.activeCheck() : isActive(format.name)"
      @click="format.action"
    />
  </ToolbarGroup>
</template>

<script setup lang="ts">
/**
 * TextFormatButtons - 文本格式按钮组
 * @description 可复用的文本格式按钮组件（粗体、斜体、下划线、删除线）
 */
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
} from "@ant-design/icons-vue";
import { computed } from "vue";

import { ToolbarButton, ToolbarGroup } from "@/components/base";
import { useYanivEditor } from "@/core/editorContext";
import { t } from "@/locales";
import "@/types/tiptapExtensions";
import { createCommandRunner } from "@/utils/editorCommands";
import { createStateCheckers } from "@/utils/editorState";

import type { Editor } from "@tiptap/vue-3";

interface Props {
  editor?: Editor | null;
}

const props = defineProps<Props>();

const editor = useYanivEditor(() => props.editor);

const runCommand = createCommandRunner(editor);
const { isActive } = createStateCheckers(editor);

interface TextFormat {
  name: string;
  icon: typeof BoldOutlined;
  title: string;
  activeCheck?: () => boolean;
  action: () => void;
}

const textFormats = computed<TextFormat[]>(() => [
  {
    name: "bold",
    icon: BoldOutlined,
    title: t("editor.bold"),
    action: () => runCommand((chain) => chain.toggleBold())(),
  },
  {
    name: "italic",
    icon: ItalicOutlined,
    title: t("editor.italic"),
    action: () => runCommand((chain) => chain.toggleItalic())(),
  },
  {
    name: "underline",
    icon: UnderlineOutlined,
    title: t("editor.underline"),
    action: () => runCommand((chain) => chain.toggleUnderline())(),
  },
  {
    name: "strike",
    icon: StrikethroughOutlined,
    title: t("editor.strike"),
    action: () => runCommand((chain) => chain.toggleStrike())(),
  },
]);
</script>
