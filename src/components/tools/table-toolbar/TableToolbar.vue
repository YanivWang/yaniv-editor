<template>
  <bubble-menu
    v-if="editor"
    :editor="editor"
    :tippy-options="{ duration: 100, placement: 'top', offset: [0, 16] }"
    :should-show="shouldShow"
    class="table-bubble-menu"
  >
    <div class="table-menu-content">
      <template v-for="item in menuTools" :key="item.key">
        <a-tooltip :title="item.title" placement="bottom">
          <span class="table-menu-btn-trigger">
            <button
              class="table-menu-btn"
              :class="{ 'table-menu-btn--danger': item.danger }"
              :disabled="item.command ? !canExecute(item.command) : false"
              @click="item.action"
            >
              <component :is="item.icon" />
            </button>
          </span>
        </a-tooltip>
      </template>
    </div>
  </bubble-menu>
</template>

<script setup lang="ts">
import {
  InsertRowAboveOutlined,
  InsertRowBelowOutlined,
  InsertRowLeftOutlined,
  InsertRowRightOutlined,
  DeleteRowOutlined,
  DeleteColumnOutlined,
  MergeCellsOutlined,
  SplitCellsOutlined,
  TableOutlined,
  DeleteOutlined,
} from "@ant-design/icons-vue";
import { BubbleMenu } from "@tiptap/vue-3/menus";
import { Tooltip as ATooltip } from "ant-design-vue";

import { shouldShowTableBubbleMenu } from "@/composables/bubbleMenuShouldShow";
import { useYanivEditor } from "@/core/editorContext";
import { t } from "@/locales";
import { createCommandRunner } from "@/utils/editorCommands";
import { createStateCheckers } from "@/utils/editorState";

import type { Component } from "vue";

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    showMode?: 1 | 2;
  }>(),
  {
    disabled: false,
    showMode: 2,
  },
);

const editor = useYanivEditor();

const runCommand = createCommandRunner(editor);
const { canExecute } = createStateCheckers(editor);

type TableToolItem = {
  key: string;
  icon: Component;
  title: string;
  command?: string;
  danger?: boolean;
  action: () => void;
};

const tool = (
  key: string,
  icon: Component,
  title: string,
  command: string,
  action: () => void,
): TableToolItem => ({
  key,
  icon,
  title,
  command,
  action,
});

function deleteTable() {
  runCommand((chain) => chain.deleteTable())();
}

// 4 列网格：行(3)+合并 | 列(3)+拆分 | 表头行+表头列+删除
const menuTools: TableToolItem[] = [
  tool(
    "addRowBefore",
    InsertRowAboveOutlined,
    t("table.addRowBefore"),
    "addRowBefore",
    runCommand((chain) => chain.addRowBefore()),
  ),
  tool(
    "addRowAfter",
    InsertRowBelowOutlined,
    t("table.addRowAfter"),
    "addRowAfter",
    runCommand((chain) => chain.addRowAfter()),
  ),
  tool(
    "deleteRow",
    DeleteRowOutlined,
    t("table.deleteRow"),
    "deleteRow",
    runCommand((chain) => chain.deleteRow()),
  ),
  tool(
    "mergeCells",
    MergeCellsOutlined,
    t("table.mergeCells"),
    "mergeCells",
    runCommand((chain) => chain.mergeCells()),
  ),
  tool(
    "addColumnBefore",
    InsertRowLeftOutlined,
    t("table.addColumnBefore"),
    "addColumnBefore",
    runCommand((chain) => chain.addColumnBefore()),
  ),
  tool(
    "addColumnAfter",
    InsertRowRightOutlined,
    t("table.addColumnAfter"),
    "addColumnAfter",
    runCommand((chain) => chain.addColumnAfter()),
  ),
  tool(
    "deleteColumn",
    DeleteColumnOutlined,
    t("table.deleteColumn"),
    "deleteColumn",
    runCommand((chain) => chain.deleteColumn()),
  ),
  tool(
    "splitCell",
    SplitCellsOutlined,
    t("table.splitCell"),
    "splitCell",
    runCommand((chain) => chain.splitCell()),
  ),
  tool(
    "toggleHeaderRow",
    TableOutlined,
    t("table.toggleHeaderRow"),
    "toggleHeaderRow",
    runCommand((chain) => chain.toggleHeaderRow()),
  ),
  tool(
    "toggleHeaderColumn",
    TableOutlined,
    t("table.toggleHeaderColumn"),
    "toggleHeaderColumn",
    runCommand((chain) => chain.toggleHeaderColumn()),
  ),
  {
    key: "deleteTable",
    icon: DeleteOutlined,
    title: t("editor.deleteTable"),
    danger: true,
    action: deleteTable,
  },
];

const shouldShow = (bubbleProps: { editor: any; state: any; from: number; to: number }) =>
  shouldShowTableBubbleMenu(bubbleProps, props.disabled, props.showMode);
</script>
