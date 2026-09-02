<template>
  <ToolbarDropdownButton
    :label="currentFont"
    :title="t('editor.fontFamily')"
    :items="dropdownItems"
    placement="bottomLeft"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { ToolbarDropdownButton } from "@/components/base";
import { FONT_FAMILIES, DEFAULT_VALUES } from "@/configs/editorConstants";
import type { MenuItemConfig } from "@/configs/toolbarTypes";
import { useYanivEditor } from "@/core/editorContext";
import { useEditorT } from "@/core/infra/useEditorLocale";
import { createCommandRunner, executeBatchCommands } from "@/utils/editorCommands";

import type { Editor } from "@tiptap/vue-3";

const t = useEditorT();

interface Props {
  editor?: Editor | null;
}

const props = defineProps<Props>();
const editor = useYanivEditor(() => props.editor);

const runCommand = createCommandRunner(editor);

const currentFont = ref<string>(DEFAULT_VALUES.fontFamily);

watch(
  editor,
  (e, _prev, onCleanup) => {
    if (!e) return;

    // 必须显式订阅事务：`editor.state` 不是 Vue 响应式的，
    // `watch(() => editor.value?.getAttributes(...))` 只在 editor **实例**换掉时才重新求值，
    // 光标在不同 字体 的文字之间移动一概读不到（实测 watch 只收到 immediate 那一次）。
    // 本仓库其余 8 个需要跟随选区的组件用的都是这个写法。
    const sync = () => {
      const fontFamily = e.getAttributes("textStyle")?.fontFamily;
      currentFont.value = fontFamily || DEFAULT_VALUES.fontFamily;
    };

    sync();
    e.on("transaction", sync);

    onCleanup(() => {
      e.off("transaction", sync);
    });
  },
  { immediate: true },
);

function applyFont(val: string) {
  const e = editor.value;
  if (!e) return;

  currentFont.value = val;

  const { from, to, empty } = e.state.selection;
  if (empty) {
    const $from = e.state.selection.$from;
    const start = $from.start($from.depth);
    const end = $from.end($from.depth);
    executeBatchCommands(editor, [
      (chain) => chain.setTextSelection({ from: start, to: end }),
      (chain) => chain.setFontFamily(val),
      (chain) => chain.setTextSelection({ from, to }),
    ]);
  } else {
    runCommand((chain) => chain.setFontFamily(val))();
  }
}

const dropdownItems = computed<MenuItemConfig[]>(() =>
  FONT_FAMILIES.map((font) => ({
    key: font.value,
    label: font.label,
    active: currentFont.value === font.value,
    action: () => applyFont(font.value),
  })),
);
</script>
