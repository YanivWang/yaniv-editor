<template>
  <bubble-menu
    v-if="editor"
    :editor="editor"
    :tippy-options="{ duration: 100, placement: 'top', offset: [0, 16] }"
    :should-show="shouldShow"
    class="table-bubble-menu"
  >
    <div class="table-menu-content">
      <!-- 第一行 -->
      <div class="table-menu-row">
        <!-- 行操作 -->
        <div class="table-menu-group">
          <a-tooltip
            v-for="item in rowTools"
            :key="item.name"
            :title="item.title"
            placement="bottom"
          >
            <span class="table-menu-btn-trigger">
              <button
                class="table-menu-btn"
                :disabled="!canExecute(item.command)"
                @click="item.action"
              >
                <component :is="item.icon" />
              </button>
            </span>
          </a-tooltip>
        </div>

        <!-- 列操作 -->
        <div class="table-menu-group">
          <a-tooltip
            v-for="item in columnTools"
            :key="item.name"
            :title="item.title"
            placement="bottom"
          >
            <span class="table-menu-btn-trigger">
              <button
                class="table-menu-btn"
                :disabled="!canExecute(item.command)"
                @click="item.action"
              >
                <component :is="item.icon" />
              </button>
            </span>
          </a-tooltip>
        </div>
      </div>

      <!-- 第二行 -->
      <div class="table-menu-row">
        <!-- 单元格操作 -->
        <div class="table-menu-group">
          <a-tooltip
            v-for="item in cellTools"
            :key="item.name"
            :title="item.title"
            placement="bottom"
          >
            <span class="table-menu-btn-trigger">
              <button
                class="table-menu-btn"
                :disabled="!canExecute(item.command)"
                @click="item.action"
              >
                <component :is="item.icon" />
              </button>
            </span>
          </a-tooltip>
        </div>

        <!-- 删除表格 -->
        <div class="table-menu-group">
          <a-tooltip :title="t('editor.deleteTable')" placement="bottom">
            <span class="table-menu-btn-trigger">
              <button class="table-menu-btn table-menu-btn--danger" @click="deleteTable">
                <DeleteOutlined />
              </button>
            </span>
          </a-tooltip>
        </div>
      </div>
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

const props = withDefaults(
  defineProps<{
    readonly?: boolean;
    showMode?: 1 | 2;
  }>(),
  {
    readonly: false,
    showMode: 2,
  },
);

const editor = useYanivEditor();

const runCommand = createCommandRunner(editor);
const { canExecute } = createStateCheckers(editor);

const rowTools = [
  {
    name: "addRowBefore",
    icon: InsertRowAboveOutlined,
    title: t("table.addRowBefore"),
    command: "addRowBefore",
    action: runCommand((chain) => chain.addRowBefore()),
  },
  {
    name: "addRowAfter",
    icon: InsertRowBelowOutlined,
    title: t("table.addRowAfter"),
    command: "addRowAfter",
    action: runCommand((chain) => chain.addRowAfter()),
  },
  {
    name: "deleteRow",
    icon: DeleteRowOutlined,
    title: t("table.deleteRow"),
    command: "deleteRow",
    action: runCommand((chain) => chain.deleteRow()),
  },
];

const columnTools = [
  {
    name: "addColumnBefore",
    icon: InsertRowLeftOutlined,
    title: t("table.addColumnBefore"),
    command: "addColumnBefore",
    action: runCommand((chain) => chain.addColumnBefore()),
  },
  {
    name: "addColumnAfter",
    icon: InsertRowRightOutlined,
    title: t("table.addColumnAfter"),
    command: "addColumnAfter",
    action: runCommand((chain) => chain.addColumnAfter()),
  },
  {
    name: "deleteColumn",
    icon: DeleteColumnOutlined,
    title: t("table.deleteColumn"),
    command: "deleteColumn",
    action: runCommand((chain) => chain.deleteColumn()),
  },
];

const cellTools = [
  {
    name: "mergeCells",
    icon: MergeCellsOutlined,
    title: t("table.mergeCells"),
    command: "mergeCells",
    action: runCommand((chain) => chain.mergeCells()),
  },
  {
    name: "splitCell",
    icon: SplitCellsOutlined,
    title: t("table.splitCell"),
    command: "splitCell",
    action: runCommand((chain) => chain.splitCell()),
  },
  {
    name: "toggleHeaderRow",
    icon: TableOutlined,
    title: t("table.toggleHeaderRow"),
    command: "toggleHeaderRow",
    action: runCommand((chain) => chain.toggleHeaderRow()),
  },
  {
    name: "toggleHeaderColumn",
    icon: TableOutlined,
    title: t("table.toggleHeaderColumn"),
    command: "toggleHeaderColumn",
    action: runCommand((chain) => chain.toggleHeaderColumn()),
  },
];

const shouldShow = (bubbleProps: { editor: any; state: any; from: number; to: number }) =>
  shouldShowTableBubbleMenu(bubbleProps, props.readonly, props.showMode);

function deleteTable() {
  runCommand((chain) => chain.deleteTable())();
}
</script>
