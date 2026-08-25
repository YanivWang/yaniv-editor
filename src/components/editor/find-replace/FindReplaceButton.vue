<template>
  <ToolbarButton :icon="SearchOutlined" :title="t('editor.findReplace')" @click="openPanel" />
</template>

<script setup lang="ts">
/**
 * FindReplaceButton — 顶栏查找入口。
 *
 * 只负责打开面板：面板本体与 Ctrl/Cmd+F 快捷键都在 `FindReplaceDialog` 里，
 * 由 `gates.searchReplace` 控制挂载，因此本按钮不渲染时快捷键依然可用。
 */
import { SearchOutlined } from "@ant-design/icons-vue";

import { ToolbarButton } from "@/components/base";
import { useEditorT } from "@/core/infra/useEditorLocale";

import { useFindReplacePanel } from "./useFindReplacePanel";

const t = useEditorT();
const { open: openPanel } = useFindReplacePanel();
</script>
